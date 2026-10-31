package dev.wavrynt.runtime

import android.os.Build
import org.json.JSONObject

/** A versioned, explicit operation dispatcher. Never reflects over native methods. */
object NativeBridge {
    fun respond(raw: String): String {
        var id: String? = null
        fun error(code: String, message: String) = JSONObject()
            .put("id", id ?: JSONObject.NULL).put("ok", false)
            .put("error", JSONObject().put("code", code).put("message", message)).toString()
        try {
            if (raw.length > 65536) return error("INVALID_REQUEST", "Request is too large")
            val request = JSONObject(raw)
            id = request.opt("id") as? String
            if (id.isNullOrBlank() || id!!.length > 128) return error("INVALID_REQUEST", "A valid request ID is required")
            if (request.opt("version") != 1 || request.opt("method") !is String ||
                request.opt("params") !is JSONObject) return error("INVALID_REQUEST", "Expected version 1, method and params object")
            val result = when (request.getString("method")) {
                "device.info" -> JSONObject()
                    .put("platform", "android").put("manufacturer", Build.MANUFACTURER)
                    .put("model", Build.MODEL).put("osVersion", Build.VERSION.RELEASE)
                    .put("sdkVersion", Build.VERSION.SDK_INT)
                else -> return error("UNKNOWN_METHOD", "Unsupported native operation")
            }
            return JSONObject().put("id", id).put("ok", true).put("result", result).toString()
        } catch (_: Exception) {
            return error("INVALID_REQUEST", "Malformed bridge request")
        }
    }
}

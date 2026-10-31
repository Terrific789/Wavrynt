package dev.wavrynt.runtime

import android.app.Activity
import android.os.Bundle
import android.net.Uri
import android.webkit.*
import android.widget.TextView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.io.ByteArrayInputStream

class MainActivity : Activity() {
    private var webView: WebView? = null
    private val origin = "https://appassets.androidplatform.net"
    private fun local(uri: Uri) = uri.scheme == "https" &&
        uri.host == "appassets.androidplatform.net" && (uri.port == -1 || uri.port == 443)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = BuildConfig.APP_LABEL
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            setContentView(TextView(this).apply { text = "Please update Android System WebView to run this application." })
            return
        }
        val view = WebView(this)
        webView = view
        // Keep content below Android's system bars, including Android 15 edge-to-edge.
        view.setOnApplyWindowInsetsListener { v, insets ->
            v.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            insets
        }
        setContentView(view)
        view.requestApplyInsets()
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = false
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        view.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                if (!local(request.url)) {
                    // Block nonlocal document loads, including POST navigations. HTTPS
                    // subresources/APIs remain subject to the browser's CORS policy.
                    if (!request.isForMainFrame) return null
                    return WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden",
                        emptyMap(), ByteArrayInputStream(ByteArray(0)))
                }
                return loader.shouldInterceptRequest(request.url) ?: WebResourceResponse(
                    "text/plain", "UTF-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = !local(request.url)
            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView, url: String) = !local(Uri.parse(url))
        }
        WebViewCompat.addWebMessageListener(view, "WavryntNative", setOf(origin)) { _, message, sourceOrigin, isMainFrame, reply ->
            if (isMainFrame && local(sourceOrigin) && message.type == androidx.webkit.WebMessageCompat.TYPE_STRING) {
                reply.postMessage(NativeBridge.respond(message.data ?: ""))
            }
        }
        if (savedInstanceState == null || view.restoreState(savedInstanceState) == null) {
            view.loadUrl(origin + "/" + BuildConfig.ENTRY_PATH)
        }
    }
    override fun onResume() { super.onResume(); webView?.onResume() }
    override fun onPause() { webView?.onPause(); super.onPause() }
    override fun onSaveInstanceState(outState: Bundle) {
        webView?.saveState(outState)
        super.onSaveInstanceState(outState)
    }
    @Deprecated("Legacy back navigation for the minimum supported Android version")
    override fun onBackPressed() {
        val view = webView
        if (view != null && view.canGoBack()) view.goBack() else super.onBackPressed()
    }
    override fun onDestroy() {
        webView?.let {
            it.stopLoading()
            WebViewCompat.removeWebMessageListener(it, "WavryntNative")
            it.removeAllViews()
            it.destroy()
        }
        webView = null
        super.onDestroy()
    }
}

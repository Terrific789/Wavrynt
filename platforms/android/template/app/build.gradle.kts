plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "dev.wavrynt.runtime"
    compileSdk = 35
    buildToolsVersion = "35.0.0"
    defaultConfig {
        applicationId = __APP_ID__
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = __APP_VERSION__
        buildConfigField("String", "ENTRY_PATH", __ENTRY_LITERAL__)
        buildConfigField("String", "APP_LABEL", __LABEL_LITERAL__)
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies { implementation("androidx.webkit:webkit:1.12.1") }

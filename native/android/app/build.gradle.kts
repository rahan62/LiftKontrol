import java.util.Properties

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.serialization")
  id("org.jetbrains.kotlin.plugin.compose")
}

val localProps =
  Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
  }

fun String.escapeForBuildConfig(): String =
  replace("\\", "\\\\").replace("\"", "\\\"")

val supUrl = (localProps.getProperty("supabaseUrl") ?: "").trim().escapeForBuildConfig()
val supKey = (localProps.getProperty("supabaseAnonKey") ?: "").trim().escapeForBuildConfig()

android {
  namespace = "com.elevatormaintenance.field"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.elevatormaintenance.field"
    minSdk = 26
    targetSdk = 35
    versionCode = 1
    versionName = "1.0"
    buildConfigField("String", "SUPABASE_URL", "\"$supUrl\"")
    buildConfigField("String", "SUPABASE_ANON_KEY", "\"$supKey\"")
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro",
      )
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions { jvmTarget = "17" }

  buildFeatures {
    compose = true
    buildConfig = true
  }
}

dependencies {
  val supabaseBom = platform("io.github.jan-tennert.supabase:bom:3.4.1")
  implementation(supabaseBom)
  implementation("io.github.jan-tennert.supabase:postgrest-kt")
  implementation("io.github.jan-tennert.supabase:auth-kt")
  implementation("io.ktor:ktor-client-android:3.4.0")

  val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
  implementation(composeBom)
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.compose.material3:material3")
  implementation("androidx.activity:activity-compose:1.9.3")
  implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
  implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

  debugImplementation("androidx.compose.ui:ui-tooling")
}

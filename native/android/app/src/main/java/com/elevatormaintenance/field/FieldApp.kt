package com.elevatormaintenance.field

import android.app.Application
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

class FieldApp : Application() {
  lateinit var supabase: io.github.jan.supabase.SupabaseClient
    private set

  override fun onCreate() {
    super.onCreate()
    var url = BuildConfig.SUPABASE_URL.trim()
    val key = BuildConfig.SUPABASE_ANON_KEY.trim()
    if (url.isEmpty() || url.contains("REPLACE", ignoreCase = true) || url.contains("YOUR_PROJECT", ignoreCase = true)) {
      url = "https://invalid.localhost"
    }
    supabase =
      createSupabaseClient(
        supabaseUrl = url,
        supabaseKey = key.ifEmpty { "invalid" },
      ) {
        install(Auth)
        install(Postgrest)
      }
  }
}

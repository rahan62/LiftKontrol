package com.elevatormaintenance.field

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.elevatormaintenance.field.ui.FieldAppRoot
import com.elevatormaintenance.field.ui.theme.ElevatorFieldTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    val app = application as FieldApp
    setContent {
      ElevatorFieldTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
          FieldAppRoot(supabase = app.supabase, secretsConfigured = secretsConfigured())
        }
      }
    }
  }

  private fun secretsConfigured(): Boolean {
    val url = BuildConfig.SUPABASE_URL.trim()
    val key = BuildConfig.SUPABASE_ANON_KEY.trim()
    if (url.isEmpty() || key.isEmpty()) return false
    if (url.contains("REPLACE", ignoreCase = true) || key.contains("REPLACE", ignoreCase = true)) return false
    if (url.contains("YOUR_PROJECT", ignoreCase = true)) return false
    return true
  }
}

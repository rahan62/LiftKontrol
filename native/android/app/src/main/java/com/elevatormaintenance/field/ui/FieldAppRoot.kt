package com.elevatormaintenance.field.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.elevatormaintenance.field.ui.screens.HomeScreen
import com.elevatormaintenance.field.ui.screens.LoginScreen
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@Composable
fun FieldAppRoot(supabase: SupabaseClient, secretsConfigured: Boolean) {
  if (!secretsConfigured) {
    Column(
      modifier = Modifier.fillMaxSize().padding(24.dp),
      verticalArrangement = Arrangement.Center,
    ) {
      Text(
        text =
          "Configure Supabase in native/android/local.properties (see local.properties.example). " +
            "Use the same URL and anon key as NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        textAlign = TextAlign.Start,
      )
    }
    return
  }

  var loggedIn by remember { mutableStateOf(supabase.auth.currentSessionOrNull() != null) }
  val scope = rememberCoroutineScope()

  if (!loggedIn) {
    LoginScreen(
      supabase = supabase,
      onSignedIn = { loggedIn = true },
    )
  } else {
    HomeScreen(
      supabase = supabase,
      onSignOut = {
        scope.launch {
          supabase.auth.signOut()
          loggedIn = false
        }
      },
    )
  }
}

package com.elevatormaintenance.field.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.elevatormaintenance.field.data.TenantMemberRow
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(supabase: SupabaseClient, onSignOut: () -> Unit) {
  var rows by remember { mutableStateOf<List<TenantMemberRow>>(emptyList()) }
  var error by remember { mutableStateOf<String?>(null) }
  var loading by remember { mutableStateOf(true) }

  LaunchedEffect(Unit) {
    loading = true
    error = null
    try {
      val result =
        supabase.from("tenant_members").select(columns = Columns.raw("id,tenant_id,system_role")) {}
      rows = result.decodeList()
    } catch (e: Exception) {
      error = e.message ?: e.toString()
    } finally {
      loading = false
    }
  }

  Scaffold(
    topBar = {
      LargeTopAppBar(
        title = { Text("Workspace") },
        actions = {
          Button(onClick = onSignOut, modifier = Modifier.padding(end = 8.dp)) { Text("Sign out") }
        },
      )
    },
  ) { padding ->
    Column(
      modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      when {
        loading -> Text("Loading…")
        error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
        rows.isEmpty() ->
          Text(
            "No tenant memberships returned. If your user should have access, check tenant_members and RLS in Supabase."
          )
        else ->
          LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(rows, key = { it.id }) { row ->
              Column {
                Text(
                  row.systemRole.replace('_', ' '),
                  style = MaterialTheme.typography.titleMedium,
                )
                Text("Tenant ${row.tenantId}", style = MaterialTheme.typography.bodySmall)
              }
            }
          }
      }
    }
  }
}

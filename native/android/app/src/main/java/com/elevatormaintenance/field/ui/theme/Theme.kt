package com.elevatormaintenance.field.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val scheme =
  lightColorScheme(
    primary = Color(0xFF1E3A5F),
    onPrimary = Color.White,
    background = Color(0xFFF5F7FA),
    onBackground = Color(0xFF1A1A1A),
  )

@Composable
fun ElevatorFieldTheme(content: @Composable () -> Unit) {
  MaterialTheme(colorScheme = scheme, content = content)
}

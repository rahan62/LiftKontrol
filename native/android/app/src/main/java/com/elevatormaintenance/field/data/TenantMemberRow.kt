package com.elevatormaintenance.field.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TenantMemberRow(
  val id: String,
  @SerialName("tenant_id") val tenantId: String,
  @SerialName("system_role") val systemRole: String,
)

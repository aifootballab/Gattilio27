'use client'

import React from 'react'
import DashboardLayout from '../../components/dashboard/DashboardLayout'
import AdminImportJSON from '../../components/admin/AdminImportJSON'

export default function AdminPage() {
  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-header">
          <h1>Area Admin</h1>
          <p>Gestione e importazione dati</p>
        </div>

        <AdminImportJSON />
      </div>
    </DashboardLayout>
  )
}

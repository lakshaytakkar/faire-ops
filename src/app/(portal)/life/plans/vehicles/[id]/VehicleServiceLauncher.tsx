"use client"

import { TriggerDrawer } from "../../../_components/EditButton"
import { LifeDrawerForm } from "../../../_components/LifeDrawerForm"
import { SPECS } from "../../../_components/field-specs"

export function VehicleServiceLauncher({ vehicleId }: { vehicleId: string }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <TriggerDrawer
      label="Log service"
      icon="add"
      render={({ open, onClose }) => (
        <LifeDrawerForm
          open={open}
          onClose={onClose}
          title="Log service"
          table="vehicle_service_logs"
          defaults={{ vehicle_id: vehicleId, date: today }}
          fields={SPECS.vehicle_service_logs}
          revalidate={`/life/plans/vehicles/${vehicleId}`}
        />
      )}
    />
  )
}

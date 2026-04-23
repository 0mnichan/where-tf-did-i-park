import { VehicleProfile } from '../types'
import { colorNameToHex } from '../utils/colorMap'

interface VehicleCardProps {
  vehicle: VehicleProfile
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const dotColor = colorNameToHex(vehicle.color)

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
      />
      <span
        className="text-xl text-[#f0f0f0] tracking-widest uppercase"
        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}
      >
        {vehicle.make}&nbsp;&nbsp;{vehicle.color}&nbsp;&nbsp;#{vehicle.plate}
      </span>
    </div>
  )
}

"use client"

import { useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import type { JournalEntry } from "@/lib/types"
import { EntrySphere } from "./entry-sphere"
import { AxisSystem } from "./axis-system"
import { Particles } from "./particles"
import { CameraController } from "./camera-controller"

interface SemanticSpaceViewProps {
  entries: JournalEntry[]
  onSelectEntry: (entry: JournalEntry | null) => void
  selectedEntry: JournalEntry | null
}

export function SemanticSpaceView({ entries, onSelectEntry, selectedEntry }: SemanticSpaceViewProps) {
  const entryPositions = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      position: [
        (entry.mood ?? 0) * 2,
        (entry.energy ?? 0) * 2,
        (entry.clarity ?? 0) * 2,
      ] as [number, number, number],
    }))
  }, [entries])

  const selectedPosition = selectedEntry
    ? ([(selectedEntry.mood ?? 0) * 2, (selectedEntry.energy ?? 0) * 2, (selectedEntry.clarity ?? 0) * 2] as [
        number,
        number,
        number,
      ])
    : null

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        gl={{ antialias: true }}
        onPointerMissed={() => onSelectEntry(null)}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4a6cf7" />

        <AxisSystem />

        {entryPositions.map(({ entry, position }) => (
          <EntrySphere
            key={entry.id}
            entry={entry}
            position={position}
            isSelected={selectedEntry?.id === entry.id}
            onClick={() => onSelectEntry(entry)}
          />
        ))}

        <Particles />

        <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={12} />
        <CameraController target={selectedPosition} />

        <color attach="background" args={["#0d0b14"]} />
        <fog attach="fog" args={["#0d0b14", 8, 20]} />
      </Canvas>

      <div className="absolute bottom-4 left-4 rounded-lg bg-card/80 p-3 text-xs backdrop-blur-sm">
        <div className="mb-2 font-medium text-foreground">Semantic Axes</div>
        <div className="space-y-1 text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span>X: Mood (Negative → Positive)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
            <span>Y: Energy (Low → High)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500/70" />
            <span>Z: Clarity (Confused → Focused)</span>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 rounded-lg bg-card/80 px-3 py-2 text-sm backdrop-blur-sm">
        <span className="text-muted-foreground">{entries.length} entries</span>
      </div>
    </div>
  )
}

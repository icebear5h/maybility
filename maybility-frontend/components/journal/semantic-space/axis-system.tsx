import { Line, Text } from "@react-three/drei"

export function AxisSystem() {
  const axisLength = 2.5

  return (
    <group>
      {/* X axis - Mood */}
      <Line
        points={[
          [-axisLength, 0, 0],
          [axisLength, 0, 0],
        ]}
        color="#ef4444"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Text position={[-axisLength - 0.3, 0, 0]} fontSize={0.15} color="#ef4444" anchorX="right">
        Negative
      </Text>
      <Text position={[axisLength + 0.3, 0, 0]} fontSize={0.15} color="#22c55e" anchorX="left">
        Positive
      </Text>
      <Text position={[0, -0.3, 0]} fontSize={0.12} color="#888" anchorY="top">
        Mood
      </Text>

      {/* Y axis - Energy */}
      <Line
        points={[
          [0, -axisLength, 0],
          [0, axisLength, 0],
        ]}
        color="#eab308"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Text position={[0, -axisLength - 0.2, 0]} fontSize={0.15} color="#6b7280" anchorY="top">
        Low
      </Text>
      <Text position={[0, axisLength + 0.2, 0]} fontSize={0.15} color="#eab308" anchorY="bottom">
        High
      </Text>
      <Text position={[0.3, 0, 0]} fontSize={0.12} color="#888" anchorX="left">
        Energy
      </Text>

      {/* Z axis - Clarity */}
      <Line
        points={[
          [0, 0, -axisLength],
          [0, 0, axisLength],
        ]}
        color="#3b82f6"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Text position={[0, 0, -axisLength - 0.2]} fontSize={0.15} color="#a855f7">
        Confused
      </Text>
      <Text position={[0, 0, axisLength + 0.2]} fontSize={0.15} color="#3b82f6">
        Focused
      </Text>

      {/* Grid on XZ plane */}
      <gridHelper args={[5, 10, "#333", "#222"]} rotation={[0, 0, 0]} />
    </group>
  )
}

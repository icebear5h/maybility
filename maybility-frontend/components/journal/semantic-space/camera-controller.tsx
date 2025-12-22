import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

interface CameraControllerProps {
  target: [number, number, number] | null
}

export function CameraController({ target }: CameraControllerProps) {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    if (target) {
      targetRef.current.set(...target)
    } else {
      targetRef.current.set(0, 0, 0)
    }
  }, [target])

  useFrame(() => {
    const current = new THREE.Vector3()
    camera.getWorldDirection(current)
  })

  return null
}

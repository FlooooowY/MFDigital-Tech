'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 30

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // Particle system
    const particleCount = window.innerWidth < 768 ? 500 : 1500
    const particles = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    const color1 = new THREE.Color(0x8B5CF6) // Primary purple
    const color2 = new THREE.Color(0xC4B5FD) // Light purple
    const color3 = new THREE.Color(0x6D28D9) // Dark purple

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      // Positions
      positions[i3] = (Math.random() - 0.5) * 100
      positions[i3 + 1] = (Math.random() - 0.5) * 100
      positions[i3 + 2] = (Math.random() - 0.5) * 50

      // Colors - mix of purple shades
      const colorChoice = Math.random()
      const color = colorChoice < 0.33 ? color1 : colorChoice < 0.66 ? color2 : color3
      
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      // Sizes
      sizes[i] = Math.random() * 2 + 0.5
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Particle material
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const particleSystem = new THREE.Points(particles, particleMaterial)
    scene.add(particleSystem)

    // Connection lines
    const lineGeometry = new THREE.BufferGeometry()
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    })

    const maxConnections = window.innerWidth < 768 ? 50 : 150
    const linePositions = new Float32Array(maxConnections * 6)
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    const lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lineSystem)

    // Animation
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      requestAnimationFrame(animate)

      // Smooth camera movement
      targetX += (mouseX - targetX) * 0.05
      targetY += (mouseY - targetY) * 0.05
      camera.position.x = targetX * 10
      camera.position.y = targetY * 10

      // Rotate particle system
      particleSystem.rotation.y += 0.0005
      particleSystem.rotation.x += 0.0002

      // Update particle positions for wave effect
      const positions = particles.attributes.position.array as Float32Array
      const time = Date.now() * 0.001

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        const x = positions[i3]
        const y = positions[i3 + 1]
        
        positions[i3 + 2] = Math.sin(x * 0.1 + time) * 2 + Math.cos(y * 0.1 + time) * 2
      }

      particles.attributes.position.needsUpdate = true

      // Update connection lines
      const linePositions = lineGeometry.attributes.position.array as Float32Array
      let lineIndex = 0

      for (let i = 0; i < particleCount && lineIndex < maxConnections * 6; i++) {
        const i3 = i * 3
        const x1 = positions[i3]
        const y1 = positions[i3 + 1]
        const z1 = positions[i3 + 2]

        for (let j = i + 1; j < particleCount && lineIndex < maxConnections * 6; j++) {
          const j3 = j * 3
          const x2 = positions[j3]
          const y2 = positions[j3 + 1]
          const z2 = positions[j3 + 2]

          const distance = Math.sqrt(
            Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
          )

          if (distance < 15) {
            linePositions[lineIndex++] = x1
            linePositions[lineIndex++] = y1
            linePositions[lineIndex++] = z1
            linePositions[lineIndex++] = x2
            linePositions[lineIndex++] = y2
            linePositions[lineIndex++] = z2

            if (lineIndex >= maxConnections * 6) break
          }
        }
      }

      lineGeometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      
      particles.dispose()
      particleMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 -z-10"
      style={{ background: 'linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 100%)' }}
    />
  )
}


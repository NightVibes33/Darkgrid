#!/usr/bin/env swift
import AppKit
import Foundation

let size = 1024
let output = CommandLine.arguments.dropFirst().first
    ?? "App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 3,
    hasAlpha: false,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 24
) else {
    fatalError("Could not create icon bitmap")
}

guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fatalError("Could not create icon graphics context")
}

func color(_ hex: UInt32, alpha: CGFloat = 1) -> NSColor {
    NSColor(
        red: CGFloat((hex >> 16) & 0xFF) / 255,
        green: CGFloat((hex >> 8) & 0xFF) / 255,
        blue: CGFloat(hex & 0xFF) / 255,
        alpha: alpha
    )
}

func stroke(_ path: NSBezierPath, color strokeColor: NSColor, width: CGFloat, glow: NSColor? = nil, blur: CGFloat = 0) {
    NSGraphicsContext.saveGraphicsState()
    if let glow {
        let shadow = NSShadow()
        shadow.shadowColor = glow
        shadow.shadowBlurRadius = blur
        shadow.shadowOffset = .zero
        shadow.set()
    }
    strokeColor.setStroke()
    path.lineWidth = width
    path.lineCapStyle = .round
    path.lineJoinStyle = .round
    path.stroke()
    NSGraphicsContext.restoreGraphicsState()
}

func fillCircle(_ rect: NSRect, color fillColor: NSColor, glow: NSColor? = nil, blur: CGFloat = 0) {
    NSGraphicsContext.saveGraphicsState()
    if let glow {
        let shadow = NSShadow()
        shadow.shadowColor = glow
        shadow.shadowBlurRadius = blur
        shadow.shadowOffset = .zero
        shadow.set()
    }
    fillColor.setFill()
    NSBezierPath(ovalIn: rect).fill()
    NSGraphicsContext.restoreGraphicsState()
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context

color(0x02040B).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size)).fill()

if let background = NSGradient(colors: [color(0x06101C), color(0x02040B), color(0x09031A)]) {
    background.draw(in: NSRect(x: 0, y: 0, width: size, height: size), angle: -35)
}

// Fixed star specks so generation is deterministic.
for point in [
    NSPoint(x: 162, y: 798), NSPoint(x: 838, y: 742), NSPoint(x: 206, y: 262),
    NSPoint(x: 802, y: 332), NSPoint(x: 709, y: 850), NSPoint(x: 311, y: 862)
] {
    fillCircle(NSRect(x: point.x - 2, y: point.y - 2, width: 4, height: 4), color: color(0x7CEBFF, alpha: 0.7))
}

let frameRect = NSRect(x: 64, y: 64, width: 896, height: 896)
let frame = NSBezierPath(roundedRect: frameRect, xRadius: 190, yRadius: 190)
stroke(frame, color: color(0x00EFFF, alpha: 0.82), width: 8, glow: color(0x00DFFF, alpha: 0.75), blur: 28)

let purpleFrame = NSBezierPath(roundedRect: NSRect(x: 76, y: 76, width: 872, height: 872), xRadius: 178, yRadius: 178)
stroke(purpleFrame, color: color(0x8E48FF, alpha: 0.56), width: 5, glow: color(0xB026FF, alpha: 0.55), blur: 22)

let center = NSPoint(x: 500, y: 510)
let radius: CGFloat = 278
let globeRect = NSRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
let globe = NSBezierPath(ovalIn: globeRect)
stroke(globe, color: color(0x00EFFF, alpha: 0.9), width: 6, glow: color(0x00EFFF, alpha: 0.7), blur: 18)

NSGraphicsContext.saveGraphicsState()
globe.addClip()

// Horizontal latitude rings.
for factor in [-0.68, -0.42, -0.18, 0.18, 0.42, 0.68] as [CGFloat] {
    let y = center.y + factor * radius
    let halfWidth = sqrt(max(0, radius * radius - pow(y - center.y, 2)))
    let rect = NSRect(x: center.x - halfWidth, y: y - 42, width: halfWidth * 2, height: 84)
    let path = NSBezierPath(ovalIn: rect)
    stroke(path, color: color(0x00DFFF, alpha: 0.55), width: 3)
}

// Vertical longitude rings.
for factor in [-0.66, -0.36, 0, 0.36, 0.66] as [CGFloat] {
    let x = center.x + factor * radius * 0.72
    let width = radius * (0.36 + (1 - abs(factor)) * 0.18)
    let rect = NSRect(x: x - width, y: center.y - radius, width: width * 2, height: radius * 2)
    let path = NSBezierPath(ovalIn: rect)
    stroke(path, color: color(factor < 0 ? 0x00DAFF : 0xB026FF, alpha: 0.48), width: 3)
}

let equator = NSBezierPath()
equator.move(to: NSPoint(x: center.x - radius, y: center.y))
equator.line(to: NSPoint(x: center.x + radius, y: center.y))
stroke(equator, color: color(0x00F5FF, alpha: 0.7), width: 4)
NSGraphicsContext.restoreGraphicsState()

// Orbit ellipse across the globe.
let orbitRect = NSRect(x: 126, y: 356, width: 776, height: 318)
let orbit = NSBezierPath(ovalIn: orbitRect)
var transform = AffineTransform.identity
transform.translate(x: center.x, y: center.y)
transform.rotate(byDegrees: -17)
transform.translate(x: -center.x, y: -center.y)
orbit.transform(using: transform)
stroke(orbit, color: color(0x00F5FF, alpha: 0.96), width: 11, glow: color(0x00F5FF, alpha: 0.78), blur: 22)

let orbitAccent = NSBezierPath(ovalIn: NSRect(x: 139, y: 369, width: 750, height: 292))
orbitAccent.transform(using: transform)
stroke(orbitAccent, color: color(0xB026FF, alpha: 0.68), width: 5, glow: color(0xB026FF, alpha: 0.5), blur: 16)

// Four-point star.
let sx: CGFloat = 770
let sy: CGFloat = 760
let star = NSBezierPath()
star.move(to: NSPoint(x: sx, y: sy + 58))
star.line(to: NSPoint(x: sx + 14, y: sy + 14))
star.line(to: NSPoint(x: sx + 58, y: sy))
star.line(to: NSPoint(x: sx + 14, y: sy - 14))
star.line(to: NSPoint(x: sx, y: sy - 58))
star.line(to: NSPoint(x: sx - 14, y: sy - 14))
star.line(to: NSPoint(x: sx - 58, y: sy))
star.line(to: NSPoint(x: sx - 14, y: sy + 14))
star.close()
NSGraphicsContext.saveGraphicsState()
let starShadow = NSShadow()
starShadow.shadowColor = color(0x8A75FF, alpha: 0.9)
starShadow.shadowBlurRadius = 28
starShadow.shadowOffset = .zero
starShadow.set()
color(0xE6F6FF).setFill()
star.fill()
NSGraphicsContext.restoreGraphicsState()

context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [.compressionFactor: 1.0]) else {
    fatalError("Could not encode icon PNG")
}

let url = URL(fileURLWithPath: output)
try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
try png.write(to: url, options: .atomic)
print("Generated NeonGrid icon: \(url.path)")

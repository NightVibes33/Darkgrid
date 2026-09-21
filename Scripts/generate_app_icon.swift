#!/usr/bin/env swift
import AppKit
import Foundation

let arguments = CommandLine.arguments
guard arguments.count >= 3 else {
    fputs("usage: generate_app_icon.swift <output.png> <source.b64>\n", stderr)
    exit(2)
}

let outputURL = URL(fileURLWithPath: arguments[1])
let sourceURL = URL(fileURLWithPath: arguments[2])

let encoded = try String(contentsOf: sourceURL, encoding: .utf8)
    .trimmingCharacters(in: .whitespacesAndNewlines)

guard let sourceData = Data(base64Encoded: encoded),
      let sourceImage = NSImage(data: sourceData) else {
    fatalError("Could not decode NeonGrid icon source")
}

let size = 1024
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

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high

NSColor.black.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size)).fill()

sourceImage.draw(
    in: NSRect(x: 0, y: 0, width: size, height: size),
    from: NSRect(origin: .zero, size: sourceImage.size),
    operation: .copy,
    fraction: 1.0,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
)

context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [.compressionFactor: 1.0]) else {
    fatalError("Could not encode icon PNG")
}

try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true,
    attributes: nil
)
try png.write(to: outputURL, options: .atomic)
print("Generated NeonGrid app icon from approved mock source: \(outputURL.path)")

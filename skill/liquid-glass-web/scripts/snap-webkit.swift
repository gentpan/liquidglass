// Render a URL with the system WebKit (the engine Safari uses) and save a PNG at the screen's
// backing scale. Lets you check the WebKit path without driving the user's Safari.
//
//   xcrun swiftc -O snap-webkit.swift -o snap-webkit
//   ./snap-webkit <url> <out.png> [width=1100] [height=2300] [delaySeconds=3] [js-expression]
//
// The optional JS expression is evaluated before the snapshot and printed (e.g. a JSON dump of
// filter ids, or document.querySelector('#engine').textContent).
import AppKit
import WebKit

let args = CommandLine.arguments
guard args.count >= 3, let url = URL(string: args[1]) else {
  print("usage: snap-webkit <url> <out.png> [width] [height] [delaySeconds] [js]")
  exit(2)
}
let out = args[2]
let width = CGFloat(Double(args.count > 3 ? args[3] : "1100") ?? 1100)
let height = CGFloat(Double(args.count > 4 ? args[4] : "2300") ?? 2300)
let delay = Double(args.count > 5 ? args[5] : "3") ?? 3
let probe = args.count > 6 ? args[6] : "navigator.userAgent"

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
// The window has to be on screen (nearly transparent, click-through): WebKit pauses
// requestAnimationFrame for occluded or off-screen views, and the glass updates on rAF.
let window = NSWindow(
  contentRect: NSRect(x: 0, y: 0, width: width, height: height),
  styleMask: [.borderless], backing: .buffered, defer: false)
window.alphaValue = 0.02
window.ignoresMouseEvents = true
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: height), configuration: WKWebViewConfiguration())
window.contentView = web
window.orderFrontRegardless()
web.load(URLRequest(url: url))

DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
  web.evaluateJavaScript(probe) { result, error in
    print("probe:", result ?? "nil", error.map { "\($0)" } ?? "")
    let config = WKSnapshotConfiguration()
    config.afterScreenUpdates = true
    web.takeSnapshot(with: config) { image, error in
      guard let image, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:])
      else {
        print("snapshot failed:", error.map { "\($0)" } ?? "unknown")
        exit(1)
      }
      do {
        try png.write(to: URL(fileURLWithPath: out))
      } catch {
        print("write failed:", error)
        exit(1)
      }
      print("saved", out, rep.pixelsWide, "x", rep.pixelsHigh)
      exit(0)
    }
  }
}
app.run()

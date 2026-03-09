import Foundation
import Capacitor
import WebKit

@objc(SSLTrustPlugin)
public class SSLTrustPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SSLTrustPlugin"
    public let jsName = "SSLTrust"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isEnabled", returnType: CAPPluginReturnPromise),
    ]

    /// Global flag checked by the swizzled method
    @objc static var sslTrustEnabled = false

    /// Track whether we've already swizzled (one-time operation)
    private static var swizzled = false

    @objc func enable(_ call: CAPPluginCall) {
        SSLTrustPlugin.sslTrustEnabled = true
        SSLTrustPlugin.installSwizzle()
        installWebViewDelegate()
        call.resolve()
    }

    @objc func disable(_ call: CAPPluginCall) {
        SSLTrustPlugin.sslTrustEnabled = false
        // Swizzle stays installed but checks the flag — when disabled, falls through to default handling
        call.resolve()
    }

    @objc func isEnabled(_ call: CAPPluginCall) {
        call.resolve(["enabled": SSLTrustPlugin.sslTrustEnabled])
    }

    // MARK: - WebView Navigation Delegate (covers <img src>, MJPEG, WSS)

    private var sslDelegate: SSLTrustNavigationDelegate?

    private func installWebViewDelegate() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let webView = self.bridge?.webView,
                  let original = webView.navigationDelegate else { return }
            // Don't re-wrap if already installed
            if original is SSLTrustNavigationDelegate { return }
            self.sslDelegate = SSLTrustNavigationDelegate(originalDelegate: original)
            webView.navigationDelegate = self.sslDelegate
        }
    }

    // MARK: - URLSession Swizzle (covers CapacitorHttp native requests)

    /// Install method swizzling on URLSession delegate handling.
    /// This intercepts authentication challenges for ALL URLSession requests,
    /// including those made by CapacitorHttp.
    @objc static func installSwizzle() {
        guard !swizzled else { return }
        swizzled = true

        // Swizzle URLSessionDelegate's didReceiveChallenge on NSObject
        // This is the same approach used by @jcesarmobile/ssl-skip
        let originalSelector = #selector(
            URLSessionDelegate.urlSession(_:didReceive:completionHandler:)
        )
        let swizzledSelector = #selector(
            NSObject.sslTrust_urlSession(_:didReceive:completionHandler:)
        )

        // Add the swizzled method to NSObject so it's available on all objects
        guard let swizzledMethod = class_getInstanceMethod(NSObject.self, swizzledSelector) else { return }
        let added = class_addMethod(
            NSObject.self,
            originalSelector,
            method_getImplementation(swizzledMethod),
            method_getTypeEncoding(swizzledMethod)
        )

        if !added {
            // Method already exists — swap implementations
            guard let originalMethod = class_getInstanceMethod(NSObject.self, originalSelector) else { return }
            method_exchangeImplementations(originalMethod, swizzledMethod)
        }
    }
}

// MARK: - Swizzled URLSession method

extension NSObject {
    @objc func sslTrust_urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if SSLTrustPlugin.sslTrustEnabled,
           challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let serverTrust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}

// MARK: - WKWebView Navigation Delegate Proxy

class SSLTrustNavigationDelegate: NSObject, WKNavigationDelegate {
    let originalDelegate: WKNavigationDelegate

    init(originalDelegate: WKNavigationDelegate) {
        self.originalDelegate = originalDelegate
        super.init()
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        return originalDelegate
    }

    override func responds(to aSelector: Selector!) -> Bool {
        if super.responds(to: aSelector) { return true }
        return originalDelegate.responds(to: aSelector)
    }

    func webView(
        _ webView: WKWebView,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if SSLTrustPlugin.sslTrustEnabled,
           challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let serverTrust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
            return
        }

        // Forward to original delegate if it handles this
        if originalDelegate.responds(to: #selector(webView(_:didReceive:completionHandler:))) {
            originalDelegate.webView?(webView, didReceive: challenge, completionHandler: completionHandler)
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}

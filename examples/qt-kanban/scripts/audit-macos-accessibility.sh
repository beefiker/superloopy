#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 EXECUTABLE" >&2
    exit 64
fi

executable=$1

if [[ $(uname -s) != "Darwin" ]]; then
    echo "Native accessibility audit is supported on macOS only." >&2
    exit 69
fi

if [[ ! -x ${executable} ]]; then
    echo "Executable is not runnable: ${executable}" >&2
    exit 66
fi

if ! swift_bin=$(xcrun --find swift 2>/dev/null); then
    echo "The macOS Swift toolchain is required for the native AX audit." >&2
    exit 69
fi

"${swift_bin}" - "${executable}" <<'SWIFT'
import ApplicationServices
import Foundation

enum AuditFailure: Error, CustomStringConvertible {
    case failed(String)

    var description: String {
        switch self {
        case .failed(let message):
            return message
        }
    }
}

func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, name as CFString, &value)
            == .success else {
        return nil
    }
    return value
}

func stringAttribute(_ element: AXUIElement, _ name: String) -> String? {
    attribute(element, name) as? String
}

func boolAttribute(_ element: AXUIElement, _ name: String) -> Bool {
    (attribute(element, name) as? NSNumber)?.boolValue ?? false
}

func children(of element: AXUIElement) -> [AXUIElement] {
    attribute(element, kAXChildrenAttribute) as? [AXUIElement] ?? []
}

func findElement(
    in root: AXUIElement,
    depth: Int = 0,
    matching predicate: (AXUIElement) -> Bool
) -> AXUIElement? {
    guard depth < 40 else { return nil }
    if predicate(root) { return root }
    for child in children(of: root) {
        if let match = findElement(in: child, depth: depth + 1,
                                   matching: predicate) {
            return match
        }
    }
    return nil
}

func waitForElement(
    in root: AXUIElement,
    timeout: TimeInterval,
    matching predicate: (AXUIElement) -> Bool
) -> AXUIElement? {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        if let match = findElement(in: root, matching: predicate) {
            return match
        }
        usleep(100_000)
    } while Date() < deadline
    return nil
}

func isElement(_ element: AXUIElement, role: String, title: String) -> Bool {
    stringAttribute(element, kAXRoleAttribute) == role
        && stringAttribute(element, kAXTitleAttribute) == title
}

do {
    guard CommandLine.arguments.count == 2 else {
        throw AuditFailure.failed("The audit requires one executable path.")
    }
    guard AXIsProcessTrusted() else {
        throw AuditFailure.failed(
            "Accessibility permission is required for the terminal running this audit."
        )
    }

    let process = Process()
    process.executableURL = URL(fileURLWithPath: CommandLine.arguments[1])
    process.arguments = ["--window-size", "1000x700"]
    var environment = ProcessInfo.processInfo.environment
    environment["QT_QUICK_CONTROLS_STYLE"] = "Basic"
    process.environment = environment
    process.standardOutput = Pipe()
    process.standardError = Pipe()
    try process.run()
    defer {
        if process.isRunning {
            process.terminate()
            process.waitUntilExit()
        }
    }

    let application = AXUIElementCreateApplication(process.processIdentifier)
    guard let card = waitForElement(in: application, timeout: 8, matching: {
        isElement($0, role: kAXButtonRole, title: "Define launch goals")
    }) else {
        throw AuditFailure.failed(
            "Northstar did not expose the Define launch goals AXButton."
        )
    }

    let description = stringAttribute(card, kAXDescriptionAttribute) ?? ""
    guard description.contains("Maya Patel") else {
        throw AuditFailure.failed("The card AX description omitted its assignee.")
    }

    let drawerActionExistsBeforePress = findElement(in: application, matching: {
        isElement($0, role: kAXButtonRole,
                  title: "Move task to next column")
    }) != nil
    guard !drawerActionExistsBeforePress else {
        throw AuditFailure.failed(
            "The compact detail drawer was unexpectedly open before AXPress."
        )
    }

    var actionValues: CFArray?
    guard AXUIElementCopyActionNames(card, &actionValues) == .success,
          let actions = actionValues as? [String],
          actions.contains(kAXPressAction) else {
        throw AuditFailure.failed("The card did not expose AXPress.")
    }

    guard AXUIElementSetAttributeValue(
        application, kAXFrontmostAttribute as CFString, kCFBooleanTrue
    ) == .success else {
        throw AuditFailure.failed("Northstar could not become the frontmost AX app.")
    }
    guard AXUIElementSetAttributeValue(
        card, kAXFocusedAttribute as CFString, kCFBooleanTrue
    ) == .success else {
        throw AuditFailure.failed("The card rejected native AX focus.")
    }
    usleep(150_000)
    guard boolAttribute(card, kAXFocusedAttribute) else {
        throw AuditFailure.failed("The card did not report native AX focus.")
    }

    guard AXUIElementPerformAction(card, kAXPressAction as CFString)
            == .success else {
        throw AuditFailure.failed("The card rejected native AXPress.")
    }
    guard waitForElement(in: application, timeout: 3, matching: {
        isElement($0, role: kAXButtonRole,
                  title: "Move task to next column")
    }) != nil else {
        throw AuditFailure.failed(
            "AXPress did not open the selected task's compact detail drawer."
        )
    }

    print("NORTHSTAR_AX_ROLE=AXButton")
    print("NORTHSTAR_AX_NAME=Define launch goals")
    print("NORTHSTAR_AX_FOCUSED=true")
    print("NORTHSTAR_AX_PRESS_RESULT=detail-drawer-opened")
    print("NORTHSTAR_AX_AUDIT=pass")
} catch {
    fputs("Native accessibility audit failed: \(error)\n", stderr)
    exit(1)
}
SWIFT

import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    name: "Theme"

    property var originalBaseFontPixelSize
    property bool originalMotionEnabled

    function initTestCase() {
        originalBaseFontPixelSize = Theme.baseFontPixelSize
        originalMotionEnabled = Theme.motionEnabled
    }

    function cleanup() {
        if (originalBaseFontPixelSize !== undefined)
            Theme.baseFontPixelSize = originalBaseFontPixelSize
        Theme.motionEnabled = originalMotionEnabled
    }

    function test_approved_color_contract() {
        compare(String(Theme.canvas), "#f4f7fa")
        compare(Theme.surface.toString(), "#ffffff")
        compare(Theme.sidebar.toString(), "#13202d")
        compare(Theme.sidebarActive.toString(), "#263748")
        compare(Theme.sidebarPressed.toString(), "#314355")
        compare(Theme.sidebarHover.toString(), "#1d2c3a")
        compare(Theme.sidebarFocus.toString(), "#93c5fd")
        compare(Theme.sidebarMutedText.toString(), "#aab6c2")
        compare(Theme.sidebarSectionText.toString(), "#91a0af")
        compare(Theme.ink.toString(), "#17212b")
        compare(Theme.muted.toString(), "#647184")
        compare(Theme.border.toString(), "#dce3ea")
        compare(Theme.borderStrong.toString(), "#c5cfda")
        compare(Theme.controlBorder.toString(), "#8796a8")
        compare(Theme.cobalt.toString(), "#2563eb")
        compare(Theme.cobaltSoft.toString(), "#e8f0ff")
        compare(Theme.primaryHover.toString(), "#2f6ff0")
        compare(Theme.primaryPressed.toString(), "#1d4ed8")
        compare(Theme.cobaltContent.toString(), "#ffffff")
        compare(Theme.focus.toString(), "#1d4ed8")
        compare(Theme.green.toString(), "#2f9d67")
        compare(Theme.greenSoft.toString(), "#e7f5ed")
        compare(Theme.greenInk.toString(), "#14613f")
        compare(Theme.coral.toString(), "#e45b4b")
        compare(Theme.coralSoft.toString(), "#fdece9")
        compare(Theme.coralInk.toString(), "#9f2f24")
        compare(Theme.neutralSoft.toString(), "#eef2f6")
        compare(Theme.neutralInk.toString(), "#445163")
        compare(Theme.avatarBlue.toString(), "#dce8ff")
        compare(Theme.avatarSlate.toString(), "#e4ebf2")
        compare(Theme.avatarLavender.toString(), "#eee8f7")
        compare(Theme.sidebarText.toString(), "#f4f7fa")
        compare(Theme.hover.toString(), "#edf3ff")
        compare(Theme.pressed.toString(), "#d8e5ff")
        compare(Theme.disabledSurface.toString(), "#e8edf2")
        compare(Theme.disabledInk.toString(), "#7a8796")
        compare(Theme.scrim.toString(), "#6617212b")
        compare(Theme.clear.a, 0)
        verify(Theme.focus.toString() !== Theme.cobalt.toString())
    }

    function relativeLuminance(color) {
        function linear(channel) {
            return channel <= 0.04045 ? channel / 12.92
                                     : Math.pow((channel + 0.055) / 1.055, 2.4)
        }

        return 0.2126 * linear(color.r)
                + 0.7152 * linear(color.g)
                + 0.0722 * linear(color.b)
    }

    function contrastRatio(first, second) {
        const firstLuminance = relativeLuminance(first)
        const secondLuminance = relativeLuminance(second)
        const lighter = Math.max(firstLuminance, secondLuminance)
        const darker = Math.min(firstLuminance, secondLuminance)
        return (lighter + 0.05) / (darker + 0.05)
    }

    function test_sidebar_focus_meets_non_text_contrast() {
        verify(contrastRatio(Theme.sidebarFocus, Theme.sidebar) >= 3)
        verify(contrastRatio(Theme.sidebarFocus, Theme.sidebarActive) >= 3)
    }

    function test_spacing_geometry_and_breakpoints() {
        compare(Theme.space1, 4)
        compare(Theme.space2, 8)
        compare(Theme.space3, 12)
        compare(Theme.space4, 16)
        compare(Theme.space5, 20)
        compare(Theme.space6, 24)
        compare(Theme.space8, 32)
        compare(Theme.controlRadius, 6)
        compare(Theme.cardRadius, 9)
        compare(Theme.panelRadius, 9)
        compare(Theme.sidebarWide, 224)
        compare(Theme.sidebarCompact, 72)
        compare(Theme.drawerWidth, 300)
        compare(Theme.persistentDrawerBreakpoint, 1560)
        compare(Theme.compactSidebarBreakpoint, 1180)
        compare(Theme.minimumWindowWidth, 900)
        compare(Theme.minimumWindowHeight, 640)
        compare(Theme.boardGutter, 12)
        compare(Theme.columnMinimumWidth, 244)
        compare(Theme.columnMaximumWidth, 280)
        compare(Theme.cardPadding, 14)
        compare(Theme.focusGutter, 4)
        compare(Theme.borderWidth, 1)
    }

    function test_type_roles_scale_from_mutable_base() {
        Theme.baseFontPixelSize = 13
        compare(Theme.titleFontPixelSize, 26)
        compare(Theme.sectionFontPixelSize, 16)
        compare(Theme.cardTitleFontPixelSize, 14)
        compare(Theme.bodyFontPixelSize, 13)
        compare(Theme.labelFontPixelSize, 12)
        compare(Theme.metaFontPixelSize, 11)
        compare(Theme.titleFontWeight, 650)
        compare(Theme.sectionFontWeight, 600)
        compare(Theme.cardTitleFontWeight, 600)
        compare(Theme.bodyFontWeight, 400)
        compare(Theme.labelFontWeight, 550)
        compare(Theme.metaFontWeight, 500)

        Theme.baseFontPixelSize = 19.5
        compare(Theme.titleFontPixelSize, 39)
        compare(Theme.sectionFontPixelSize, 24)
        compare(Theme.cardTitleFontPixelSize, 21)
        compare(Theme.bodyFontPixelSize, 19.5)
        compare(Theme.labelFontPixelSize, 18)
        compare(Theme.metaFontPixelSize, 16.5)
    }

    function test_type_roles_keep_readable_line_heights() {
        compare(Theme.titleLineHeight, 1.2)
        compare(Theme.sectionLineHeight, 1.25)
        compare(Theme.cardTitleLineHeight, 1.3)
        compare(Theme.bodyLineHeight, 1.4)
        compare(Theme.labelLineHeight, 1.35)
        compare(Theme.metaLineHeight, 1.35)
    }

    function test_motion_can_be_disabled_deterministically() {
        Theme.motionEnabled = true
        compare(Theme.feedbackDuration, 120)
        compare(Theme.transitionDuration, 180)

        Theme.motionEnabled = false
        compare(Theme.feedbackDuration, 0)
        compare(Theme.transitionDuration, 0)
    }
}

pragma Singleton
import QtQuick

QtObject {
    // Color
    readonly property color canvas: "#F4F7FA"
    readonly property color surface: "#FFFFFF"
    readonly property color sidebar: "#13202D"
    readonly property color sidebarActive: "#263748"
    readonly property color sidebarFocus: "#93C5FD"
    readonly property color ink: "#17212B"
    readonly property color muted: "#647184"
    readonly property color border: "#DCE3EA"
    readonly property color borderStrong: "#C5CFDA"
    readonly property color controlBorder: "#8796A8"
    readonly property color cobalt: "#2563EB"
    readonly property color cobaltSoft: "#E8F0FF"
    // DESIGN.md token `onCobalt`; `on<Name>` is reserved for QML signal handlers.
    readonly property color cobaltContent: "#FFFFFF"
    readonly property color focus: "#1D4ED8"
    readonly property color green: "#2F9D67"
    readonly property color greenSoft: "#E7F5ED"
    readonly property color greenInk: "#14613F"
    readonly property color coral: "#E45B4B"
    readonly property color coralSoft: "#FDECE9"
    readonly property color coralInk: "#9F2F24"
    readonly property color neutralSoft: "#EEF2F6"
    readonly property color neutralInk: "#445163"
    readonly property color sidebarText: "#F4F7FA"
    readonly property color hover: "#EDF3FF"
    readonly property color pressed: "#D8E5FF"
    readonly property color disabledSurface: "#E8EDF2"
    readonly property color disabledInk: "#7A8796"
    readonly property color scrim: "#6617212B"

    // Typography scales from the inherited application font.
    // qmllint disable missing-property
    property real baseFontPixelSize: Qt.application.font.pixelSize > 0
                                      ? Qt.application.font.pixelSize : 13
    // qmllint enable missing-property
    readonly property real titleFontPixelSize: baseFontPixelSize * 2
    readonly property real sectionFontPixelSize: baseFontPixelSize * 16 / 13
    readonly property real cardTitleFontPixelSize: baseFontPixelSize * 14 / 13
    readonly property real bodyFontPixelSize: baseFontPixelSize
    readonly property real labelFontPixelSize: baseFontPixelSize * 12 / 13
    readonly property real metaFontPixelSize: baseFontPixelSize * 11 / 13
    readonly property int titleFontWeight: 650
    readonly property int sectionFontWeight: 600
    readonly property int cardTitleFontWeight: 600
    readonly property int bodyFontWeight: 400
    readonly property int labelFontWeight: 550
    readonly property int metaFontWeight: 500
    readonly property real titleLineHeight: 1.2
    readonly property real sectionLineHeight: 1.25
    readonly property real cardTitleLineHeight: 1.3
    readonly property real bodyLineHeight: 1.4
    readonly property real labelLineHeight: 1.35
    readonly property real metaLineHeight: 1.35

    // Spacing and geometry
    readonly property int space1: 4
    readonly property int space2: 8
    readonly property int space3: 12
    readonly property int space4: 16
    readonly property int space5: 20
    readonly property int space6: 24
    readonly property int space8: 32
    readonly property int controlRadius: 6
    readonly property int cardRadius: 9
    readonly property int panelRadius: 9
    readonly property int borderWidth: 1
    readonly property int boardGutter: 12
    readonly property int columnMinimumWidth: 244
    readonly property int columnMaximumWidth: 280
    readonly property int cardPadding: 14
    readonly property int sidebarWide: 224
    readonly property int sidebarCompact: 72
    readonly property int drawerWidth: 300
    readonly property int minimumWindowWidth: 900
    readonly property int minimumWindowHeight: 640

    // Responsive breakpoints
    readonly property int persistentDrawerBreakpoint: 1560
    readonly property int compactSidebarBreakpoint: 1180

    // Motion
    property bool motionEnabled: true
    readonly property int feedbackDuration: motionEnabled ? 120 : 0
    readonly property int transitionDuration: motionEnabled ? 180 : 0
}

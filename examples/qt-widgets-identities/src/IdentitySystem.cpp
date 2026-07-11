#include "IdentitySystem.h"

#include <QStandardItem>

namespace SignalBench {

namespace {

QString color(const QColor &value)
{
    return value.name(QColor::HexRgb);
}

} // namespace

QString IdentityTheme::contentStyleSheet() const
{
    QString sheet = QStringLiteral(R"QSS(
#SignalBenchRoot {
    background: @canvas;
    color: @text;
}
#HeaderPanel, #PresetPanel, #AnalysisPanel, #ControlPanel, #StatusPanel {
    background: @surface;
    border: 1px solid @grid;
    border-radius: @radiuspx;
}
#HeaderPanel { background: @panel; }
#AppTitle { color: @text; font-size: 20px; font-weight: 700; }
#IdentityCaption, #SectionEyebrow, #StatusLabel { color: @muted; }
#SectionTitle { color: @text; font-size: 14px; font-weight: 700; }
#SignalLamp { color: @warning; font-weight: 700; }
QLabel { color: @text; }
QLabel:disabled { color: @muted; }
QComboBox, QLineEdit, QPushButton, QSpinBox {
    min-height: 28px;
    padding: 2px @controlpadpx;
    color: @text;
    background: @panel;
    border: 1px solid @grid;
    border-radius: @radiuspx;
}
QComboBox:hover, QLineEdit:hover, QPushButton:hover, QSpinBox:hover { border-color: @accent; }
QComboBox:focus, QLineEdit:focus, QPushButton:focus, QSpinBox:focus {
    border: 2px @focusstyle @focus;
    padding: 1px @focuspadpx;
}
QComboBox:disabled, QLineEdit:disabled, QPushButton:disabled, QSpinBox:disabled {
    color: @muted;
    background: @canvas;
}
QComboBox QAbstractItemView {
    color: @text;
    background: @surface;
    selection-color: @text;
    selection-background-color: @accent;
    border: 1px solid @focus;
}
QAbstractItemView {
    color: @text;
    background: transparent;
    border: 0;
    outline: 0;
    selection-background-color: transparent;
}
QHeaderView::section {
    color: @muted;
    background: @panel;
    border: 0;
    border-bottom: 1px solid @grid;
    padding: 5px;
    font-weight: 600;
}
QSplitter::handle { background: @canvas; width: @spacingpx; }
QScrollBar:vertical {
    background: transparent;
    width: 10px;
    margin: 0;
}
QScrollBar::handle:vertical {
    background: @grid;
    min-height: 24px;
    border-radius: 4px;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
)QSS");
    sheet.replace(QStringLiteral("@canvas"), color(canvas));
    sheet.replace(QStringLiteral("@surface"), color(surface));
    sheet.replace(QStringLiteral("@panel"), color(panel));
    sheet.replace(QStringLiteral("@text"), color(text));
    sheet.replace(QStringLiteral("@muted"), color(muted));
    sheet.replace(QStringLiteral("@accent"), color(accent));
    sheet.replace(QStringLiteral("@focuspadpx"), QStringLiteral("%1px").arg(spacing + 3));
    sheet.replace(QStringLiteral("@focusstyle"),
                  id == QStringLiteral("precision") ? QStringLiteral("dashed")
                                                     : QStringLiteral("solid"));
    sheet.replace(QStringLiteral("@focus"), color(focus));
    sheet.replace(QStringLiteral("@grid"), color(grid));
    sheet.replace(QStringLiteral("@warning"), color(warning));
    sheet.replace(QStringLiteral("@spacingpx"), QStringLiteral("%1px").arg(spacing));
    sheet.replace(QStringLiteral("@radiuspx"), QStringLiteral("%1px").arg(radius));
    sheet.replace(QStringLiteral("@controlpadpx"), QStringLiteral("%1px").arg(spacing + 4));
    return sheet;
}

IdentityTheme themeFor(Identity identity)
{
    IdentityTheme theme;
    if (identity == Identity::Precision) {
        theme.id = QStringLiteral("precision");
        theme.displayName = QStringLiteral("Precision Lab");
        theme.canvas = QColor(QStringLiteral("#e9eef5"));
        theme.surface = QColor(QStringLiteral("#ffffff"));
        theme.panel = QColor(QStringLiteral("#f6f8fb"));
        theme.text = QColor(QStringLiteral("#172033"));
        theme.muted = QColor(QStringLiteral("#637188"));
        theme.accent = QColor(QStringLiteral("#2f6fed"));
        theme.focus = QColor(QStringLiteral("#174fbf"));
        theme.grid = QColor(QStringLiteral("#d4dce8"));
        theme.trace = QColor(QStringLiteral("#079e96"));
        theme.warning = QColor(QStringLiteral("#b86508"));
        theme.rowHeight = 34;
        theme.spacing = 4;
        theme.radius = 4;
        theme.depthLayers = 1;
        theme.pickerKind = PickerKind::Table;
        theme.graphGrammar = GraphGrammar::Cartesian;
        theme.dialGrammar = DialGrammar::Arc;
        return theme;
    }

    theme.id = QStringLiteral("rack");
    theme.displayName = QStringLiteral("Hardware Rack");
    theme.canvas = QColor(QStringLiteral("#15181d"));
    theme.surface = QColor(QStringLiteral("#20252c"));
    theme.panel = QColor(QStringLiteral("#2a3038"));
    theme.text = QColor(QStringLiteral("#f3eee2"));
    theme.muted = QColor(QStringLiteral("#a9b0b8"));
    theme.accent = QColor(QStringLiteral("#efa43a"));
    theme.focus = QColor(QStringLiteral("#ffc462"));
    theme.grid = QColor(QStringLiteral("#4a525d"));
    theme.trace = QColor(QStringLiteral("#62d486"));
    theme.warning = QColor(QStringLiteral("#ffbd57"));
    theme.rowHeight = 50;
    theme.spacing = 8;
    theme.radius = 8;
    theme.depthLayers = 3;
    theme.pickerKind = PickerKind::Cards;
    theme.graphGrammar = GraphGrammar::Instrument;
    theme.dialGrammar = DialGrammar::Hardware;
    return theme;
}

QPalette identityPalette(Identity identity, const QPalette &source)
{
    const IdentityTheme theme = themeFor(identity);
    QPalette palette(source);
    for (const QPalette::ColorGroup group : {
             QPalette::Active, QPalette::Inactive, QPalette::Disabled}) {
        const bool active = group == QPalette::Active;
        const bool disabled = group == QPalette::Disabled;
        palette.setColor(group, QPalette::Window, theme.canvas);
        palette.setColor(group, QPalette::Base, theme.surface);
        palette.setColor(group, QPalette::Button, theme.panel);
        palette.setColor(group, QPalette::Text, disabled ? theme.muted : theme.text);
        palette.setColor(group, QPalette::PlaceholderText, theme.muted);
        palette.setColor(group, QPalette::Highlight, active ? theme.accent : theme.muted);
        palette.setColor(group, QPalette::Accent, active ? theme.focus : theme.muted);
        palette.setColor(group, QPalette::Mid, theme.grid);
        palette.setColor(group, QPalette::Link, active ? theme.trace : theme.muted);
    }
    return palette;
}

SessionModel::SessionModel(QObject *parent)
    : QObject(parent)
    , m_presets(this)
    , m_bands(this)
    , m_presetSelection(&m_presets, this)
{
    struct Preset {
        const char *title;
        const char *subtitle;
        const char *status;
    };
    const Preset presets[] = {
        {"Reference Flat", "Neutral monitoring baseline", "CAL"},
        {"Voice Detail", "Speech presence with low cut", "+2.0"},
        {"Night Console", "Low-energy late session", "SAFE"},
        {"Seoul Broadcast", "\354\204\234\354\232\270 \353\260\251\354\206\241 \354\235\214\354\204\261 \355\224\204\353\246\254\354\205\213", "LIVE"},
        {"Wide Field \360\237\216\247", "Extended stereo review", "WIDE"},
        {"Archive Check", "Long-form restoration inspection", "QC"},
    };
    for (const Preset &preset : presets) {
        auto *item = new QStandardItem(QString::fromUtf8(preset.title));
        item->setData(QString::fromUtf8(preset.title), TitleRole);
        item->setData(QString::fromUtf8(preset.subtitle), SubtitleRole);
        item->setData(QString::fromUtf8(preset.status), StatusRole);
        item->setEditable(false);
        m_presets.appendRow(item);
    }

    m_bands.setHorizontalHeaderLabels({
        tr("Band"), tr("Frequency"), tr("Gain"), tr("Q")});
    const QList<QList<QString>> bands = {
        {tr("Low shelf"), QStringLiteral("80 Hz"), QStringLiteral("+1.5 dB"), QStringLiteral("0.70")},
        {tr("Body"), QStringLiteral("220 Hz"), QStringLiteral("-1.0 dB"), QStringLiteral("1.10")},
        {tr("Clarity"), QStringLiteral("1.2 kHz"), QStringLiteral("+2.5 dB"), QStringLiteral("1.35")},
        {tr("Presence"), QStringLiteral("3.8 kHz"), QStringLiteral("+1.0 dB"), QStringLiteral("0.95")},
        {tr("Air"), QStringLiteral("9.5 kHz"), QStringLiteral("+2.0 dB"), QStringLiteral("0.65")},
        {tr("Safety cut"), QStringLiteral("18 kHz"), QStringLiteral("-0.5 dB"), QStringLiteral("1.60")},
    };
    for (const QList<QString> &row : bands) {
        QList<QStandardItem *> items;
        for (const QString &value : row) {
            auto *item = new QStandardItem(value);
            item->setTextAlignment(Qt::AlignVCenter | Qt::AlignLeft);
            items.append(item);
        }
        m_bands.appendRow(items);
    }

    const QModelIndex initial = m_presets.index(0, 0);
    m_presetSelection.setCurrentIndex(
        initial, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
}

QStandardItemModel *SessionModel::presetModel()
{
    return &m_presets;
}

QStandardItemModel *SessionModel::bandModel()
{
    return &m_bands;
}

QItemSelectionModel *SessionModel::presetSelection()
{
    return &m_presetSelection;
}

QByteArray SessionModel::snapshot(const QList<int> &dialValues) const
{
    QByteArray snapshot("preset=");
    const QModelIndexList selectedRows = m_presetSelection.selectedRows();
    snapshot += selectedRows.isEmpty()
        ? QByteArrayLiteral("none")
        : QByteArray::number(selectedRows.constFirst().row());
    snapshot += ";bands=";
    for (int row = 0; row < m_bands.rowCount(); ++row) {
        for (int column = 0; column < m_bands.columnCount(); ++column) {
            snapshot += m_bands.index(row, column).data().toString().toUtf8();
            snapshot += column + 1 == m_bands.columnCount() ? '|' : ',';
        }
    }
    snapshot += ";dials=";
    for (int value : dialValues) {
        snapshot += QByteArray::number(value) + ',';
    }
    return snapshot;
}

} // namespace SignalBench

#include "IdentitySystem.h"

#include <QFontDatabase>
#include <QHeaderView>
#include <QListView>
#include <QPalette>
#include <QPainter>
#include <QPainterPath>
#include <QStyle>
#include <QStyleOptionSlider>
#include <QStyleOptionViewItem>
#include <QTableView>

#include <cmath>

namespace SignalBench {

namespace {

QColor mixed(const QColor &first, const QColor &second, int firstWeight)
{
    const int secondWeight = 100 - firstWeight;
    return QColor(
        (first.red() * firstWeight + second.red() * secondWeight) / 100,
        (first.green() * firstWeight + second.green() * secondWeight) / 100,
        (first.blue() * firstWeight + second.blue() * secondWeight) / 100);
}

QString presetTitle(const QModelIndex &index)
{
    const QString title = index.data(SessionModel::TitleRole).toString();
    return title.isEmpty() ? index.data(Qt::DisplayRole).toString() : title;
}

QPalette::ColorGroup colorGroupFor(QStyle::State state)
{
    if (!state.testFlag(QStyle::State_Enabled)) {
        return QPalette::Disabled;
    }
    return state.testFlag(QStyle::State_Active)
        ? QPalette::Active
        : QPalette::Inactive;
}

} // namespace

BandDelegate::BandDelegate(Identity identity, QObject *parent)
    : QStyledItemDelegate(parent)
    , m_identity(identity)
{
}

Identity BandDelegate::identity() const
{
    return m_identity;
}

void BandDelegate::setIdentity(Identity identity)
{
    if (m_identity == identity) {
        return;
    }
    m_identity = identity;
}

QSize BandDelegate::sizeHint(const QStyleOptionViewItem &option,
                             const QModelIndex &index) const
{
    QStyleOptionViewItem resolved(option);
    initStyleOption(&resolved, index);
    const auto theme = themeFor(m_identity);
    const QString title = presetTitle(index);
    const QString subtitle = index.data(SessionModel::SubtitleRole).toString();
    const bool preset = index.data(SessionModel::TitleRole).isValid();
    const int textWidth = resolved.fontMetrics.horizontalAdvance(title)
        + resolved.fontMetrics.horizontalAdvance(subtitle) + 72;
    const int textHeight = preset
        ? resolved.fontMetrics.height()
            + qMax(8, resolved.fontMetrics.height() - 2) + 4
        : resolved.fontMetrics.height() + 10;
    return {qMax(120, textWidth), qMax(theme.rowHeight, textHeight)};
}

void BandDelegate::paint(QPainter *painter,
                         const QStyleOptionViewItem &option,
                         const QModelIndex &index) const
{
    QStyleOptionViewItem resolved(option);
    initStyleOption(&resolved, index);
    const auto theme = themeFor(m_identity);
    const bool selected = resolved.state.testFlag(QStyle::State_Selected);
    const bool focused = resolved.state.testFlag(QStyle::State_HasFocus);
    const bool enabled = resolved.state.testFlag(QStyle::State_Enabled);
    const QPalette::ColorGroup colorGroup = colorGroupFor(resolved.state);
    const QPalette &palette = resolved.palette;
    const bool preset = index.data(SessionModel::TitleRole).isValid();
    const QRect rowRect = resolved.rect.adjusted(
        m_identity == Identity::Rack ? 4 : 0,
        m_identity == Identity::Rack ? 3 : 0,
        m_identity == Identity::Rack ? -4 : 0,
        m_identity == Identity::Rack ? -3 : 0);

    painter->save();
    painter->setRenderHint(QPainter::Antialiasing, m_identity == Identity::Rack);
    QColor background = palette.color(
        colorGroup, m_identity == Identity::Rack ? QPalette::Button : QPalette::Base);
    if (selected) {
        background = mixed(palette.color(colorGroup, QPalette::Highlight), background,
                           m_identity == Identity::Rack ? 28 : 16);
    }
    if (!enabled) {
        background = mixed(palette.color(colorGroup, QPalette::Window), background, 60);
    }
    if (m_identity == Identity::Rack) {
        painter->setPen(QPen(palette.color(colorGroup, QPalette::Mid)));
    } else {
        painter->setPen(Qt::NoPen);
    }
    painter->setBrush(background);
    painter->drawRoundedRect(rowRect, theme.radius, theme.radius);
    if (m_identity == Identity::Rack && selected) {
        painter->setPen(QPen(palette.color(colorGroup, QPalette::Highlight), 2));
        painter->setBrush(Qt::NoBrush);
        painter->drawRoundedRect(
            rowRect.adjusted(1, 1, -1, -1), theme.radius, theme.radius);
    }

    if (m_identity == Identity::Precision && selected) {
        const QRect marker = QStyle::visualRect(
            resolved.direction, rowRect, QRect(rowRect.left(), rowRect.top(), 3, rowRect.height()));
        painter->fillRect(marker, palette.color(colorGroup, QPalette::Highlight));
    }

    const QColor foreground = palette.color(colorGroup, QPalette::Text);
    const int horizontalPad = m_identity == Identity::Rack ? 13 : 10;
    QRect textRect = rowRect.adjusted(horizontalPad, 0, -horizontalPad, 0);
    const int alignment = Qt::AlignVCenter
        | (resolved.direction == Qt::RightToLeft ? Qt::AlignRight : Qt::AlignLeft);
    painter->setPen(foreground);

    if (preset) {
        const QString title = presetTitle(index);
        const QString subtitle = index.data(SessionModel::SubtitleRole).toString();
        const QString status = index.data(SessionModel::StatusRole).toString();
        QFont titleFont = resolved.font;
        titleFont.setWeight(QFont::DemiBold);
        painter->setFont(titleFont);
        const int statusWidth = resolved.fontMetrics.horizontalAdvance(status) + 18;
        QRect statusRect = QStyle::visualRect(
            resolved.direction, textRect,
            QRect(textRect.right() - statusWidth + 1, textRect.top(), statusWidth, textRect.height()));
        QRect copyRect = textRect;
        if (resolved.direction == Qt::RightToLeft) {
            copyRect.setLeft(statusRect.right() + 8);
        } else {
            copyRect.setRight(statusRect.left() - 8);
        }
        const Qt::TextElideMode elideMode = resolved.direction == Qt::RightToLeft
            ? Qt::ElideLeft
            : Qt::ElideRight;
        const int titleHeight = subtitle.isEmpty() ? copyRect.height() : copyRect.height() / 2 + 5;
        const QString visibleTitle = QFontMetrics(titleFont).elidedText(
            title, elideMode, copyRect.width());
        painter->drawText(QRect(copyRect.left(), copyRect.top(), copyRect.width(), titleHeight),
                          alignment, visibleTitle);
        if (!subtitle.isEmpty()) {
            QFont detailFont = resolved.font;
            detailFont.setPointSizeF(qMax(8.0, detailFont.pointSizeF() - 1.0));
            painter->setFont(detailFont);
            painter->setPen(palette.color(colorGroup, QPalette::PlaceholderText));
            const QString visibleSubtitle = QFontMetrics(detailFont).elidedText(
                subtitle, elideMode, copyRect.width());
            painter->drawText(QRect(copyRect.left(), copyRect.top() + titleHeight - 6,
                                    copyRect.width(), copyRect.height() - titleHeight + 6),
                              alignment, visibleSubtitle);
        }
        painter->setFont(titleFont);
        painter->setPen(selected
                            ? palette.color(colorGroup, QPalette::Accent)
                            : palette.color(colorGroup, QPalette::PlaceholderText));
        painter->drawText(statusRect, Qt::AlignCenter, status);
    } else {
        QFont valueFont = resolved.font;
        if (index.column() > 0) {
            valueFont = QFontDatabase::systemFont(QFontDatabase::FixedFont);
            if (resolved.font.pointSizeF() > 0.0) {
                valueFont.setPointSizeF(resolved.font.pointSizeF());
            } else if (resolved.font.pixelSize() > 0) {
                valueFont.setPixelSize(resolved.font.pixelSize());
            }
        }
        painter->setFont(valueFont);
        const QString visibleValue = QFontMetrics(valueFont).elidedText(
            index.data(Qt::DisplayRole).toString(), Qt::ElideRight, textRect.width());
        painter->drawText(textRect, alignment, visibleValue);
    }

    if (focused) {
        QPen focusPen(palette.color(colorGroup, QPalette::Accent), 2);
        if (m_identity == Identity::Precision) {
            focusPen.setStyle(Qt::DashLine);
        }
        painter->setPen(focusPen);
        painter->setBrush(Qt::NoBrush);
        painter->drawRoundedRect(rowRect.adjusted(1, 1, -1, -1), theme.radius, theme.radius);
    }
    painter->restore();
}

ResponseGraph::ResponseGraph(QWidget *parent)
    : QWidget(parent)
{
    setFocusPolicy(Qt::NoFocus);
    setAccessibleName(QStringLiteral("Frequency response graph"));
    setAccessibleDescription(
        QStringLiteral("Frequency response summary for six filter bands"));
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Expanding);
}

Identity ResponseGraph::identity() const
{
    return m_identity;
}

void ResponseGraph::setIdentity(Identity identity)
{
    if (m_identity == identity) {
        return;
    }
    m_identity = identity;
    update();
}

QSize ResponseGraph::minimumSizeHint() const
{
    return {360, 220};
}

void ResponseGraph::paintEvent(QPaintEvent *)
{
    const auto theme = themeFor(m_identity);
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing);
    if (!isEnabled()) {
        painter.setOpacity(0.46);
    }
    const QRectF bounds = rect().adjusted(14, 12, -14, -12);
    painter.setPen(theme.grid);
    painter.setBrush(m_identity == Identity::Precision ? theme.surface : theme.panel);
    painter.drawRoundedRect(bounds, theme.radius, theme.radius);

    const QRectF plot = bounds.adjusted(44, 18, -18, -30);
    QPen gridPen(theme.grid, 1);
    if (m_identity == Identity::Rack) {
        gridPen.setStyle(Qt::DashLine);
        painter.setBrush(mixed(theme.surface, theme.panel, 42));
        painter.setPen(Qt::NoPen);
        for (int band = 0; band < 3; ++band) {
            QRectF stripe(plot.left(), plot.top() + plot.height() * band / 3.0,
                          plot.width(), plot.height() / 6.0);
            painter.drawRect(stripe);
        }
    }
    painter.setPen(gridPen);
    for (int x = 0; x <= 6; ++x) {
        const qreal px = plot.left() + plot.width() * x / 6.0;
        painter.drawLine(QPointF(px, plot.top()), QPointF(px, plot.bottom()));
    }
    for (int y = 0; y <= 4; ++y) {
        const qreal py = plot.top() + plot.height() * y / 4.0;
        painter.drawLine(QPointF(plot.left(), py), QPointF(plot.right(), py));
    }

    const QStringList labels = {
        QStringLiteral("40"), QStringLiteral("100"), QStringLiteral("400"),
        QStringLiteral("1k"), QStringLiteral("4k"), QStringLiteral("10k"),
        QStringLiteral("20k")};
    painter.setPen(theme.muted);
    QFont labelFont = QFontDatabase::systemFont(QFontDatabase::FixedFont);
    labelFont.setPointSizeF(qMax(8.0, labelFont.pointSizeF() - 1.0));
    painter.setFont(labelFont);
    for (int x = 0; x < labels.size(); ++x) {
        const qreal px = plot.left() + plot.width() * x / 6.0;
        painter.drawText(QRectF(px - 24, plot.bottom() + 7, 48, 18),
                         Qt::AlignHCenter | Qt::AlignTop, labels.at(x));
    }
    painter.drawText(QRectF(bounds.left() + 5, plot.top() - 8, 36, 18),
                     Qt::AlignRight, QStringLiteral("+12"));
    painter.drawText(QRectF(bounds.left() + 5, plot.center().y() - 8, 36, 18),
                     Qt::AlignRight, QStringLiteral("0"));
    painter.drawText(QRectF(bounds.left() + 5, plot.bottom() - 8, 36, 18),
                     Qt::AlignRight, QStringLiteral("-12"));

    const QList<qreal> response = {0.53, 0.48, 0.58, 0.38, 0.44, 0.31, 0.42};
    QPainterPath path;
    for (int point = 0; point < response.size(); ++point) {
        const QPointF sample(plot.left() + plot.width() * point / 6.0,
                             plot.top() + plot.height() * response.at(point));
        if (point == 0) {
            path.moveTo(sample);
        } else {
            path.lineTo(sample);
        }
    }
    if (m_identity == Identity::Rack) {
        QPainterPath fill(path);
        fill.lineTo(plot.bottomRight());
        fill.lineTo(plot.bottomLeft());
        fill.closeSubpath();
        QColor fillColor = theme.trace;
        fillColor.setAlpha(42);
        painter.fillPath(fill, fillColor);
    }
    painter.setPen(QPen(theme.trace, m_identity == Identity::Rack ? 3.0 : 2.0,
                        Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
    painter.drawPath(path);
    painter.setBrush(theme.surface);
    for (int point = 0; point < response.size(); ++point) {
        const QPointF sample(plot.left() + plot.width() * point / 6.0,
                             plot.top() + plot.height() * response.at(point));
        painter.drawEllipse(sample, m_identity == Identity::Rack ? 4.5 : 3.0,
                            m_identity == Identity::Rack ? 4.5 : 3.0);
    }

    if (m_identity == Identity::Rack) {
        painter.setPen(QPen(theme.grid, 1));
        painter.setBrush(theme.canvas);
        for (const QPointF &corner : {bounds.topLeft(), bounds.topRight(),
                                      bounds.bottomLeft(), bounds.bottomRight()}) {
            const QPointF inset(
                corner.x() + (corner.x() < bounds.center().x() ? 8 : -8),
                corner.y() + (corner.y() < bounds.center().y() ? 8 : -8));
            painter.drawEllipse(inset, 2.5, 2.5);
        }
    }
}

SignalDial::SignalDial(const QString &accessibleName, QWidget *parent)
    : QDial(parent)
{
    setPalette(identityPalette(m_identity, palette()));
    setAccessibleName(accessibleName);
    setAccessibleDescription(
        QStringLiteral("Adjusts a Signal Bench audio value"));
    setRange(-12, 12);
    setSingleStep(1);
    setPageStep(3);
    setNotchesVisible(true);
    setFocusPolicy(Qt::StrongFocus);
    setMinimumSize(92, 92);
    setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Preferred);
}

Identity SignalDial::identity() const
{
    return m_identity;
}

void SignalDial::setIdentity(Identity identity)
{
    if (m_identity == identity) {
        return;
    }
    m_identity = identity;
    setPalette(identityPalette(m_identity, palette()));
    update();
}

void SignalDial::paintEvent(QPaintEvent *)
{
    QStyleOptionSlider option;
    initStyleOption(&option);
    const QPalette::ColorGroup colorGroup = colorGroupFor(option.state);
    const QPalette &palette = option.palette;
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing);
    const qreal side = qMin(width(), height()) - 16.0;
    const QRectF dialRect((width() - side) / 2.0, (height() - side) / 2.0,
                          side, side);
    const qreal span = maximum() - minimum();
    const qreal ratio = span > 0.0 ? (value() - minimum()) / span : 0.0;
    const qreal startAngle = 225.0;
    const qreal sweep = 270.0 * ratio;

    if (m_identity == Identity::Precision) {
        painter.setPen(QPen(palette.color(colorGroup, QPalette::Mid),
                            5, Qt::SolidLine, Qt::RoundCap));
        painter.drawArc(dialRect.adjusted(7, 7, -7, -7),
                        static_cast<int>(-45 * 16), static_cast<int>(-270 * 16));
        painter.setPen(QPen(palette.color(colorGroup, QPalette::Highlight),
                            5, Qt::SolidLine, Qt::RoundCap));
        painter.drawArc(dialRect.adjusted(7, 7, -7, -7),
                        static_cast<int>(-225 * 16), static_cast<int>(sweep * 16));
        painter.setPen(palette.color(colorGroup, QPalette::Text));
        painter.setFont(QFontDatabase::systemFont(QFontDatabase::FixedFont));
        painter.drawText(dialRect, Qt::AlignCenter,
                         QStringLiteral("%1").arg(value(), value() >= 0 ? 3 : 0));
    } else {
        painter.setPen(QPen(palette.color(colorGroup, QPalette::Window), 3));
        painter.setBrush(palette.color(colorGroup, QPalette::Base));
        painter.drawEllipse(dialRect.adjusted(3, 3, -3, -3));
        painter.setPen(QPen(palette.color(colorGroup, QPalette::Mid), 2));
        painter.setBrush(palette.color(colorGroup, QPalette::Button));
        painter.drawEllipse(dialRect.adjusted(11, 11, -11, -11));
        constexpr qreal pi = 3.14159265358979323846;
        const qreal angle = (startAngle + 270.0 * ratio) * pi / 180.0;
        const QPointF center = dialRect.center();
        const qreal pointerRadius = side * 0.27;
        const QPointF tip(center.x() + std::cos(angle) * pointerRadius,
                          center.y() + std::sin(angle) * pointerRadius);
        painter.setPen(QPen(palette.color(colorGroup, QPalette::Highlight),
                            4, Qt::SolidLine, Qt::RoundCap));
        painter.drawLine(center, tip);
        painter.setPen(Qt::NoPen);
        painter.setBrush(palette.color(colorGroup, QPalette::Link));
        painter.drawEllipse(center, 3.5, 3.5);
    }

    if (option.state.testFlag(QStyle::State_HasFocus)) {
        painter.setPen(QPen(palette.color(colorGroup, QPalette::Accent), 2,
                            m_identity == Identity::Precision ? Qt::DashLine : Qt::SolidLine));
        painter.setBrush(Qt::NoBrush);
        painter.drawEllipse(dialRect.adjusted(1, 1, -1, -1));
    }
}

QAbstractItemView *createPresetPicker(Identity identity,
                                      QAbstractItemModel *model,
                                      QItemSelectionModel *selection,
                                      QWidget *parent)
{
    Q_ASSERT(model);
    Q_ASSERT(selection);
    Q_ASSERT(selection->model() == model);

    QAbstractItemView *view = nullptr;
    if (identity == Identity::Precision) {
        auto *table = new QTableView(parent);
        const auto theme = themeFor(identity);
        table->horizontalHeader()->hide();
        table->verticalHeader()->hide();
        table->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
        table->verticalHeader()->setMinimumSectionSize(theme.rowHeight);
        table->verticalHeader()->setSectionResizeMode(QHeaderView::ResizeToContents);
        table->setShowGrid(false);
        view = table;
    } else {
        auto *list = new QListView(parent);
        list->setSpacing(4);
        list->setUniformItemSizes(false);
        list->setResizeMode(QListView::Adjust);
        view = list;
    }

    view->setObjectName(identity == Identity::Precision
                            ? QStringLiteral("PrecisionPresetPicker")
                            : QStringLiteral("RackPresetPicker"));
    view->setPalette(identityPalette(identity, view->palette()));
    view->setModel(model);
    QItemSelectionModel *temporarySelection = view->selectionModel();
    view->setSelectionModel(selection);
    if (temporarySelection && temporarySelection != selection) {
        delete temporarySelection;
    }
    view->setSelectionBehavior(QAbstractItemView::SelectRows);
    view->setSelectionMode(QAbstractItemView::SingleSelection);
    view->setVerticalScrollMode(QAbstractItemView::ScrollPerPixel);
    view->setHorizontalScrollMode(QAbstractItemView::ScrollPerPixel);
    view->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    view->setEditTriggers(QAbstractItemView::NoEditTriggers);
    view->setTabKeyNavigation(false);
    view->setAlternatingRowColors(false);
    view->setItemDelegate(new BandDelegate(identity, view));
    view->setAccessibleName(QStringLiteral("Signal Bench presets"));
    view->setAccessibleDescription(
        QStringLiteral("Choose a shared audio preset and press Enter to activate it"));
    return view;
}

} // namespace SignalBench

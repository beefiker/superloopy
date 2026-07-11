#pragma once

#include <QColor>
#include <QDial>
#include <QItemSelectionModel>
#include <QStandardItemModel>
#include <QStyledItemDelegate>
#include <QWidget>

class QAbstractItemView;

namespace SignalBench {

enum class Identity {
    Precision,
    Rack
};

enum class PickerKind {
    Table,
    Cards
};

enum class GraphGrammar {
    Cartesian,
    Instrument
};

enum class DialGrammar {
    Arc,
    Hardware
};

enum class GalleryState {
    Normal,
    Focused,
    Selected,
    Disabled
};

struct IdentityTheme {
    QString id;
    QString displayName;
    QColor canvas;
    QColor surface;
    QColor panel;
    QColor text;
    QColor muted;
    QColor accent;
    QColor focus;
    QColor grid;
    QColor trace;
    QColor warning;
    int rowHeight = 0;
    int spacing = 0;
    int radius = 0;
    int depthLayers = 0;
    PickerKind pickerKind = PickerKind::Table;
    GraphGrammar graphGrammar = GraphGrammar::Cartesian;
    DialGrammar dialGrammar = DialGrammar::Arc;

    QString contentStyleSheet() const;
};

IdentityTheme themeFor(Identity identity);

class SessionModel final : public QObject {
    Q_OBJECT

public:
    enum PresetRole {
        TitleRole = Qt::UserRole + 1,
        SubtitleRole,
        StatusRole
    };

    explicit SessionModel(QObject *parent = nullptr);

    QStandardItemModel *presetModel();
    QStandardItemModel *bandModel();
    QItemSelectionModel *presetSelection();
    QByteArray snapshot(const QList<int> &dialValues) const;

private:
    QStandardItemModel m_presets;
    QStandardItemModel m_bands;
    QItemSelectionModel m_presetSelection;
};

class BandDelegate final : public QStyledItemDelegate {
    Q_OBJECT

public:
    explicit BandDelegate(Identity identity, QObject *parent = nullptr);

    Identity identity() const;
    void setIdentity(Identity identity);
    QSize sizeHint(const QStyleOptionViewItem &option,
                   const QModelIndex &index) const override;
    void paint(QPainter *painter, const QStyleOptionViewItem &option,
               const QModelIndex &index) const override;

private:
    Identity m_identity;
};

class ResponseGraph final : public QWidget {
    Q_OBJECT

public:
    explicit ResponseGraph(QWidget *parent = nullptr);

    Identity identity() const;
    void setIdentity(Identity identity);
    QSize minimumSizeHint() const override;

protected:
    void paintEvent(QPaintEvent *event) override;

private:
    Identity m_identity = Identity::Precision;
};

class SignalDial final : public QDial {
    Q_OBJECT

public:
    explicit SignalDial(const QString &accessibleName,
                        QWidget *parent = nullptr);

    Identity identity() const;
    void setIdentity(Identity identity);

protected:
    void paintEvent(QPaintEvent *event) override;

private:
    Identity m_identity = Identity::Precision;
};

QAbstractItemView *createPresetPicker(Identity identity,
                                      QAbstractItemModel *model,
                                      QItemSelectionModel *selection,
                                      QWidget *parent = nullptr);

} // namespace SignalBench

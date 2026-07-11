#pragma once

#include "IdentitySystem.h"

#include <QMainWindow>

class QAction;
class QAbstractItemView;
class QComboBox;
class QLabel;
class QPushButton;
class QSplitter;
class QTableView;
class QVBoxLayout;

namespace SignalBench {

class SignalBenchWindow final : public QMainWindow {
    Q_OBJECT

public:
    explicit SignalBenchWindow(QWidget *parent = nullptr);

    Identity identity() const;
    bool setIdentity(Identity identity);

    SessionModel *sessionModel() const;
    QAbstractItemView *pickerView() const;
    QTableView *bandTable() const;
    ResponseGraph *responseGraph() const;
    QList<SignalDial *> dials() const;
    QAction *presetAction() const;
    QList<int> splitterSizes() const;
    QByteArray sessionSnapshot() const;

    void activateCurrentPreset();
    bool writeGallery(const QString &directory, QString *error = nullptr);
    static bool validateGalleryArtifacts(const QString &directory,
                                         QString *error = nullptr);
    bool hasUnexpectedHorizontalScrollbars() const;
    static QStringList galleryFileNames();

signals:
    void identityChanged(SignalBench::Identity identity);
    void presetActivated(const QString &presetName);

protected:
    bool eventFilter(QObject *watched, QEvent *event) override;

private:
    void applyIdentityPresentation();
    void applyTabOrder();
    void connectPicker(QAbstractItemView *picker);
    bool renderGallery(const QString &directory, QString *error);
    QString selectedPresetName() const;
    void updatePresetSelectionState();

    Identity m_identity = Identity::Precision;
    SessionModel *m_session = nullptr;
    QAction *m_presetAction = nullptr;
    QAction *m_precisionAction = nullptr;
    QAction *m_rackAction = nullptr;
    QWidget *m_root = nullptr;
    QSplitter *m_splitter = nullptr;
    QWidget *m_pickerHost = nullptr;
    QVBoxLayout *m_pickerLayout = nullptr;
    QAbstractItemView *m_picker = nullptr;
    QTableView *m_bandTable = nullptr;
    ResponseGraph *m_graph = nullptr;
    QComboBox *m_identitySelector = nullptr;
    QPushButton *m_activateButton = nullptr;
    QLabel *m_identityCaption = nullptr;
    QLabel *m_statusLabel = nullptr;
    QList<SignalDial *> m_dials;
};

} // namespace SignalBench

Q_DECLARE_METATYPE(SignalBench::Identity)

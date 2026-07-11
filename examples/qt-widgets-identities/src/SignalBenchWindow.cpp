#include "SignalBenchWindow.h"

#include <QAbstractItemView>
#include <QAction>
#include <QActionGroup>
#include <QApplication>
#include <QComboBox>
#include <QEvent>
#include <QFontDatabase>
#include <QFrame>
#include <QHeaderView>
#include <QHBoxLayout>
#include <QKeyEvent>
#include <QLabel>
#include <QLayoutItem>
#include <QPersistentModelIndex>
#include <QPushButton>
#include <QScrollBar>
#include <QSignalBlocker>
#include <QSplitter>
#include <QTableView>
#include <QVBoxLayout>

namespace SignalBench {

namespace {

QFrame *panel(const QString &objectName, QWidget *parent)
{
    auto *frame = new QFrame(parent);
    frame->setObjectName(objectName);
    frame->setFrameShape(QFrame::NoFrame);
    return frame;
}

QLabel *label(const QString &text, const QString &objectName, QWidget *parent)
{
    auto *result = new QLabel(text, parent);
    result->setObjectName(objectName);
    return result;
}

} // namespace

SignalBenchWindow::SignalBenchWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_session(new SessionModel(this))
    , m_presetAction(new QAction(tr("Activate preset"), this))
    , m_precisionAction(new QAction(tr("Precision Lab"), this))
    , m_rackAction(new QAction(tr("Hardware Rack"), this))
    , m_root(new QWidget(this))
    , m_splitter(new QSplitter(Qt::Horizontal, m_root))
{
    setWindowTitle(tr("Signal Bench — Precision Lab"));
    setMinimumSize(1000, 680);
    resize(1280, 800);
    m_root->setObjectName(QStringLiteral("SignalBenchRoot"));
    auto *rootLayout = new QVBoxLayout(m_root);
    rootLayout->setContentsMargins(18, 16, 18, 14);
    rootLayout->setSpacing(10);

    auto *header = panel(QStringLiteral("HeaderPanel"), m_root);
    auto *headerLayout = new QHBoxLayout(header);
    headerLayout->setContentsMargins(14, 10, 14, 10);
    headerLayout->setSpacing(12);
    auto *mark = label(QStringLiteral("SB"), QStringLiteral("SignalLamp"), header);
    mark->setAlignment(Qt::AlignCenter);
    mark->setFixedSize(38, 38);
    mark->setAccessibleName(tr("Signal Bench"));
    headerLayout->addWidget(mark);

    auto *titleStack = new QVBoxLayout;
    titleStack->setSpacing(0);
    titleStack->addWidget(label(tr("SIGNAL BENCH"), QStringLiteral("AppTitle"), header));
    m_identityCaption = label(
        tr("Precision Lab · calibrated analysis surface"),
        QStringLiteral("IdentityCaption"), header);
    titleStack->addWidget(m_identityCaption);
    headerLayout->addLayout(titleStack);
    headerLayout->addStretch();

    auto *sessionLamp = label(tr("●  SESSION CLEAN"), QStringLiteral("SignalLamp"), header);
    sessionLamp->setAccessibleName(tr("Session status: clean"));
    headerLayout->addWidget(sessionLamp);
    m_identitySelector = new QComboBox(header);
    m_identitySelector->setAccessibleName(tr("Visual identity"));
    m_identitySelector->addItem(tr("Precision Lab"), static_cast<int>(Identity::Precision));
    m_identitySelector->addItem(tr("Hardware Rack"), static_cast<int>(Identity::Rack));
    m_identitySelector->setMinimumWidth(164);
    headerLayout->addWidget(m_identitySelector);
    rootLayout->addWidget(header);

    m_splitter->setChildrenCollapsible(false);
    m_splitter->setHandleWidth(8);

    auto *presetPanel = panel(QStringLiteral("PresetPanel"), m_splitter);
    presetPanel->setMinimumWidth(220);
    auto *presetLayout = new QVBoxLayout(presetPanel);
    presetLayout->setContentsMargins(12, 12, 12, 12);
    presetLayout->setSpacing(6);
    presetLayout->addWidget(label(tr("PRESET LIBRARY"), QStringLiteral("SectionEyebrow"), presetPanel));
    presetLayout->addWidget(label(tr("Monitoring profiles"), QStringLiteral("SectionTitle"), presetPanel));
    auto *presetHint = label(
        tr("Shared session model · Enter to activate"),
        QStringLiteral("IdentityCaption"), presetPanel);
    presetHint->setWordWrap(true);
    presetLayout->addWidget(presetHint);
    m_pickerHost = new QWidget(presetPanel);
    m_pickerHost->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Expanding);
    m_pickerLayout = new QVBoxLayout(m_pickerHost);
    m_pickerLayout->setContentsMargins(0, 4, 0, 0);
    m_pickerLayout->setSpacing(0);
    m_picker = createPresetPicker(
        m_identity, m_session->presetModel(), m_session->presetSelection(), m_pickerHost);
    m_pickerLayout->addWidget(m_picker);
    presetLayout->addWidget(m_pickerHost, 1);
    m_activateButton = new QPushButton(tr("Activate selected preset"), presetPanel);
    m_activateButton->setAccessibleDescription(tr("Activates the current preset"));
    m_activateButton->setFocusPolicy(Qt::StrongFocus);
    presetLayout->addWidget(m_activateButton);

    auto *analysisPanel = panel(QStringLiteral("AnalysisPanel"), m_splitter);
    analysisPanel->setMinimumWidth(450);
    auto *analysisLayout = new QVBoxLayout(analysisPanel);
    analysisLayout->setContentsMargins(12, 12, 12, 12);
    analysisLayout->setSpacing(7);
    auto *analysisHeader = new QHBoxLayout;
    auto *analysisTitle = new QVBoxLayout;
    analysisTitle->setSpacing(0);
    analysisTitle->addWidget(label(tr("RESPONSE"), QStringLiteral("SectionEyebrow"), analysisPanel));
    analysisTitle->addWidget(label(tr("Six-band calibration"), QStringLiteral("SectionTitle"), analysisPanel));
    analysisHeader->addLayout(analysisTitle);
    analysisHeader->addStretch();
    analysisHeader->addWidget(label(tr("●  SIGNAL LOCKED"), QStringLiteral("SignalLamp"), analysisPanel));
    analysisLayout->addLayout(analysisHeader);
    m_graph = new ResponseGraph(analysisPanel);
    analysisLayout->addWidget(m_graph, 3);
    m_bandTable = new QTableView(analysisPanel);
    m_bandTable->setAccessibleName(tr("Filter bands"));
    m_bandTable->setAccessibleDescription(tr("Editable six-band response values"));
    m_bandTable->setModel(m_session->bandModel());
    m_bandTable->setItemDelegate(new BandDelegate(m_identity, m_bandTable));
    m_bandTable->verticalHeader()->hide();
    m_bandTable->verticalHeader()->setSectionResizeMode(QHeaderView::ResizeToContents);
    m_bandTable->horizontalHeader()->setStretchLastSection(true);
    m_bandTable->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    m_bandTable->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_bandTable->setSelectionMode(QAbstractItemView::SingleSelection);
    m_bandTable->setTabKeyNavigation(false);
    m_bandTable->setShowGrid(false);
    m_bandTable->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    m_bandTable->setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    m_bandTable->setMinimumHeight(242);
    analysisLayout->addWidget(m_bandTable, 2);

    auto *controlPanel = panel(QStringLiteral("ControlPanel"), m_splitter);
    controlPanel->setMinimumWidth(210);
    auto *controlLayout = new QVBoxLayout(controlPanel);
    controlLayout->setContentsMargins(12, 12, 12, 12);
    controlLayout->setSpacing(5);
    controlLayout->addWidget(label(tr("OUTPUT MODULE"), QStringLiteral("SectionEyebrow"), controlPanel));
    controlLayout->addWidget(label(tr("Signal controls"), QStringLiteral("SectionTitle"), controlPanel));
    const QList<QPair<QString, int>> dialDefinitions = {
        {tr("Input gain"), -2},
        {tr("Output trim"), 1},
        {tr("Mix"), 8},
    };
    for (const auto &definition : dialDefinitions) {
        auto *dialRow = new QWidget(controlPanel);
        auto *dialLayout = new QHBoxLayout(dialRow);
        dialLayout->setContentsMargins(0, 4, 0, 4);
        dialLayout->setSpacing(4);
        auto *dial = new SignalDial(definition.first, dialRow);
        dial->setValue(definition.second);
        m_dials.append(dial);
        auto *dialText = new QVBoxLayout;
        dialText->setSpacing(2);
        auto *dialName = label(definition.first.toUpper(), QStringLiteral("SectionEyebrow"), dialRow);
        auto *dialValue = label(QStringLiteral("%1 dB").arg(dial->value()),
                                QStringLiteral("SectionTitle"), dialRow);
        QFont valueFont = QFontDatabase::systemFont(QFontDatabase::FixedFont);
        if (dialValue->font().pointSizeF() > 0.0) {
            valueFont.setPointSizeF(dialValue->font().pointSizeF());
        } else if (dialValue->font().pixelSize() > 0) {
            valueFont.setPixelSize(dialValue->font().pixelSize());
        }
        dialValue->setFont(valueFont);
        dialText->addWidget(dialName);
        dialText->addWidget(dialValue);
        dialText->addStretch();
        dialLayout->addWidget(dial, 1);
        dialLayout->addLayout(dialText, 1);
        controlLayout->addWidget(dialRow, 1);
        connect(dial, &QDial::valueChanged, dialValue, [dialValue](int value) {
            dialValue->setText(QStringLiteral("%1 dB").arg(value));
        });
    }
    controlLayout->addStretch();

    m_splitter->addWidget(presetPanel);
    m_splitter->addWidget(analysisPanel);
    m_splitter->addWidget(controlPanel);
    m_splitter->setStretchFactor(0, 0);
    m_splitter->setStretchFactor(1, 1);
    m_splitter->setStretchFactor(2, 0);
    rootLayout->addWidget(m_splitter, 1);

    auto *statusPanel = panel(QStringLiteral("StatusPanel"), m_root);
    auto *statusLayout = new QHBoxLayout(statusPanel);
    statusLayout->setContentsMargins(10, 6, 10, 6);
    m_statusLabel = label(
        tr("Ready · Reference Flat selected"), QStringLiteral("StatusLabel"), statusPanel);
    statusLayout->addWidget(m_statusLabel);
    statusLayout->addStretch();
    statusLayout->addWidget(label(
        tr("SESSION SNAPSHOT EXCLUDES VISUAL IDENTITY"),
        QStringLiteral("SectionEyebrow"), statusPanel));
    rootLayout->addWidget(statusPanel);
    setCentralWidget(m_root);

    m_precisionAction->setCheckable(true);
    m_rackAction->setCheckable(true);
    m_precisionAction->setChecked(true);
    m_precisionAction->setShortcut(QKeySequence(QStringLiteral("Ctrl+1")));
    m_rackAction->setShortcut(QKeySequence(QStringLiteral("Ctrl+2")));
    auto *identityActions = new QActionGroup(this);
    identityActions->setExclusive(true);
    identityActions->addAction(m_precisionAction);
    identityActions->addAction(m_rackAction);
    addAction(m_precisionAction);
    addAction(m_rackAction);

    connect(m_precisionAction, &QAction::triggered, this, [this] {
        setIdentity(Identity::Precision);
    });
    connect(m_rackAction, &QAction::triggered, this, [this] {
        setIdentity(Identity::Rack);
    });
    connect(m_identitySelector, &QComboBox::currentIndexChanged, this, [this](int index) {
        const Identity requested = static_cast<Identity>(
            m_identitySelector->itemData(index).toInt());
        (requested == Identity::Precision ? m_precisionAction : m_rackAction)->trigger();
    });
    connect(m_activateButton, &QPushButton::clicked, m_presetAction, &QAction::trigger);
    connect(m_presetAction, &QAction::triggered, this, [this] {
        const QString presetName = selectedPresetName();
        if (presetName.isEmpty()) {
            return;
        }
        m_statusLabel->setText(tr("Active · %1 · snapshot stable").arg(presetName));
        emit presetActivated(presetName);
    });
    connect(m_session->presetSelection(), &QItemSelectionModel::selectionChanged,
            this, [this] { updatePresetSelectionState(); });
    connectPicker(m_picker);
    updatePresetSelectionState();

    applyTabOrder();
    m_splitter->setSizes({250, 720, 250});
    applyIdentityPresentation();
}

Identity SignalBenchWindow::identity() const
{
    return m_identity;
}

bool SignalBenchWindow::setIdentity(Identity identity)
{
    if (identity == m_identity) {
        return false;
    }

    const bool pickerHadFocus = m_picker && (m_picker->hasFocus()
        || (QApplication::focusWidget() && m_picker->isAncestorOf(QApplication::focusWidget())));
    const QPersistentModelIndex current(m_session->presetSelection()->currentIndex());
    QPersistentModelIndex topAnchor;
    int anchorOffset = 0;
    int scrollValue = 0;
    if (m_picker) {
        topAnchor = QPersistentModelIndex(m_picker->indexAt(QPoint(4, 4)));
        if (topAnchor.isValid()) {
            anchorOffset = qMax(0, -m_picker->visualRect(topAnchor).top());
        }
        scrollValue = m_picker->verticalScrollBar()->value();
    }
    const QList<int> sizes = m_splitter->sizes();
    QAbstractItemView *oldPicker = m_picker;

    m_identity = identity;
    m_picker = createPresetPicker(
        m_identity, m_session->presetModel(), m_session->presetSelection(), m_pickerHost);
    QLayoutItem *oldPickerItem = m_pickerLayout->replaceWidget(oldPicker, m_picker);
    Q_ASSERT(oldPickerItem);
    delete oldPickerItem;
    connectPicker(m_picker);
    applyTabOrder();
    m_picker->show();
    oldPicker->hide();
    delete oldPicker;

    applyIdentityPresentation();
    if (current.isValid()) {
        m_session->presetSelection()->setCurrentIndex(
            current, QItemSelectionModel::NoUpdate);
    }
    if (topAnchor.isValid()) {
        m_picker->scrollTo(topAnchor, QAbstractItemView::PositionAtTop);
        QScrollBar *scrollbar = m_picker->verticalScrollBar();
        scrollbar->setValue(qBound(
            scrollbar->minimum(), scrollbar->value() + anchorOffset, scrollbar->maximum()));
    } else {
        QScrollBar *scrollbar = m_picker->verticalScrollBar();
        scrollbar->setValue(qBound(scrollbar->minimum(), scrollValue, scrollbar->maximum()));
    }
    m_splitter->setSizes(sizes);
    if (pickerHadFocus) {
        m_picker->setFocus(Qt::OtherFocusReason);
    }

    emit identityChanged(m_identity);
    return true;
}

SessionModel *SignalBenchWindow::sessionModel() const
{
    return m_session;
}

QAbstractItemView *SignalBenchWindow::pickerView() const
{
    return m_picker;
}

QTableView *SignalBenchWindow::bandTable() const
{
    return m_bandTable;
}

ResponseGraph *SignalBenchWindow::responseGraph() const
{
    return m_graph;
}

QList<SignalDial *> SignalBenchWindow::dials() const
{
    return m_dials;
}

QAction *SignalBenchWindow::presetAction() const
{
    return m_presetAction;
}

QList<int> SignalBenchWindow::splitterSizes() const
{
    return m_splitter ? m_splitter->sizes() : QList<int>();
}

QByteArray SignalBenchWindow::sessionSnapshot() const
{
    QList<int> values;
    for (auto *dial : m_dials) {
        values.append(dial->value());
    }
    return m_session ? m_session->snapshot(values) : QByteArray();
}

void SignalBenchWindow::activateCurrentPreset()
{
    if (m_presetAction->isEnabled()) {
        m_presetAction->trigger();
    }
}

bool SignalBenchWindow::eventFilter(QObject *watched, QEvent *event)
{
    const bool pickerInput = m_picker
        && (watched == m_picker || watched == m_picker->viewport());
    if (pickerInput && event->type() == QEvent::KeyPress) {
        const auto *keyEvent = static_cast<QKeyEvent *>(event);
        if (keyEvent->key() == Qt::Key_Return || keyEvent->key() == Qt::Key_Enter) {
            m_presetAction->trigger();
            return true;
        }
    }
    return QMainWindow::eventFilter(watched, event);
}

void SignalBenchWindow::applyIdentityPresentation()
{
    const auto theme = themeFor(m_identity);
    m_root->setProperty("signalIdentity", theme.id);
    m_root->setStyleSheet(theme.contentStyleSheet());
    setWindowTitle(tr("Signal Bench — %1").arg(theme.displayName));
    m_identityCaption->setText(
        m_identity == Identity::Precision
            ? tr("Precision Lab · calibrated analysis surface")
            : tr("Hardware Rack · tactile signal modules"));
    {
        const QSignalBlocker blocker(m_identitySelector);
        m_identitySelector->setCurrentIndex(m_identity == Identity::Precision ? 0 : 1);
    }
    m_precisionAction->setChecked(m_identity == Identity::Precision);
    m_rackAction->setChecked(m_identity == Identity::Rack);
    m_graph->setIdentity(m_identity);
    m_bandTable->setPalette(identityPalette(m_identity, m_bandTable->palette()));
    for (SignalDial *dial : m_dials) {
        dial->setIdentity(m_identity);
        dial->setPalette(identityPalette(m_identity, dial->palette()));
        dial->updateGeometry();
    }
    if (auto *delegate = qobject_cast<BandDelegate *>(m_bandTable->itemDelegate())) {
        delegate->setIdentity(m_identity);
    }
    m_bandTable->verticalHeader()->setMinimumSectionSize(theme.rowHeight);
    m_bandTable->resizeRowsToContents();
    m_bandTable->doItemsLayout();
    m_bandTable->viewport()->update();
    if (m_picker) {
        m_picker->setPalette(identityPalette(m_identity, m_picker->palette()));
        m_picker->updateGeometry();
        m_picker->doItemsLayout();
        m_picker->viewport()->update();
    }
    m_root->updateGeometry();
    if (m_root->layout()) {
        m_root->layout()->invalidate();
    }
}

void SignalBenchWindow::applyTabOrder()
{
    setTabOrder(m_identitySelector, m_picker);
    setTabOrder(m_picker, m_activateButton);
    setTabOrder(m_activateButton, m_bandTable);
    if (!m_dials.isEmpty()) {
        setTabOrder(m_bandTable, m_dials.first());
        for (int index = 1; index < m_dials.size(); ++index) {
            setTabOrder(m_dials.at(index - 1), m_dials.at(index));
        }
    }
}

void SignalBenchWindow::connectPicker(QAbstractItemView *picker)
{
    connect(picker, &QAbstractItemView::doubleClicked,
            m_presetAction, &QAction::trigger, Qt::UniqueConnection);
    picker->installEventFilter(this);
    picker->viewport()->installEventFilter(this);
}

QString SignalBenchWindow::selectedPresetName() const
{
    const QModelIndexList selectedRows = m_session->presetSelection()->selectedRows();
    if (selectedRows.isEmpty()) {
        return {};
    }
    const QModelIndex selected = selectedRows.constFirst();
    QString name = selected.data(SessionModel::TitleRole).toString();
    if (name.isEmpty()) {
        name = selected.data(Qt::DisplayRole).toString();
    }
    return name;
}

void SignalBenchWindow::updatePresetSelectionState()
{
    const QString presetName = selectedPresetName();
    const bool hasSelection = !presetName.isEmpty();
    m_presetAction->setEnabled(hasSelection);
    m_activateButton->setEnabled(hasSelection);
    m_statusLabel->setText(
        hasSelection
            ? tr("Ready · %1 selected").arg(presetName)
            : tr("Ready · No preset selected"));
}

} // namespace SignalBench

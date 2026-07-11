#include "IdentitySystem.h"
#include "SignalBenchWindow.h"

#include <QAbstractItemView>
#include <QAccessible>
#include <QAccessibleActionInterface>
#include <QAccessibleValueInterface>
#include <QApplication>
#include <QComboBox>
#include <QDir>
#include <QFontMetrics>
#include <QFile>
#include <QFileInfo>
#include <QImage>
#include <QItemSelectionModel>
#include <QLabel>
#include <QListView>
#include <QLineEdit>
#include <QPainter>
#include <QPersistentModelIndex>
#include <QPointer>
#include <QProcess>
#include <QProcessEnvironment>
#include <QPushButton>
#include <QScrollBar>
#include <QSignalSpy>
#include <QSplitter>
#include <QStyleOptionViewItem>
#include <QTableView>
#include <QTemporaryDir>
#include <QTest>

#include <memory>

using namespace SignalBench;

class SignalBenchTest final : public QObject {
    Q_OBJECT

private slots:
    void identityConstitutionsDifferBeyondPalette();
    void pickerFactoryCreatesDistinctStructures();
    void pickerFactorySharesModelAndSelection();
    void noSelectionDisablesPresetActivation();
    void identitySwitchRoundTripPreservesState();
    void identitySwitchRestoresTabOrder();
    void sameIdentitySwitchIsNoOp();
    void delegateMetricsFollowIdentity();
    void delegatePaintUsesActiveInactiveAndDisabledGroups();
    void dialPaintUsesActiveInactiveAndDisabledGroups();
    void identityPaletteIsAppliedAtWidgetBoundaries();
    void enlargedTextAndRtlRemainRenderable();
    void presetActivationUsesSharedActionExactlyOnce();
    void identitySwitchPreservesBandEditor();
    void dialKeyboardAndAccessibilitySurviveSwitch();
    void graphAccessibilityIsInformational();
    void galleryWritesExactMatrix();
    void galleryValidatorRejectsTransparentPixels();
    void galleryCliIgnoresConflictingCallerEnvironment();
    void galleryFailureRestoresWindowState();
    void galleryIgnoresCallerState();
    void minimumSizeHasNoUnexpectedHorizontalScrollbars();
};

namespace {

QString signalBenchExecutable()
{
    QString fileName = QStringLiteral("qtwidgetsidentities");
#ifdef Q_OS_WIN
    fileName += QStringLiteral(".exe");
#endif
    return QDir(QCoreApplication::applicationDirPath()).filePath(fileName);
}

QString runGalleryProcess(const QString &executable,
                          const QString &directory,
                          const QProcessEnvironment &environment,
                          bool joinedOption = false)
{
    QProcess process;
    process.setProcessEnvironment(environment);
    process.setProgram(executable);
    process.setArguments(joinedOption
                             ? QStringList{QStringLiteral("--gallery=%1").arg(directory)}
                             : QStringList{QStringLiteral("--gallery"), directory});
    process.start();
    if (!process.waitForStarted()) {
        return QStringLiteral("Could not start gallery process: %1").arg(process.errorString());
    }
    if (!process.waitForFinished(30000)) {
        process.kill();
        process.waitForFinished();
        return QStringLiteral("Gallery process timed out");
    }
    if (process.exitStatus() != QProcess::NormalExit || process.exitCode() != 0) {
        return QStringLiteral("Gallery process failed (%1): %2")
            .arg(process.exitCode())
            .arg(QString::fromUtf8(process.readAllStandardError()));
    }
    return {};
}

QImage renderDelegate(BandDelegate *delegate,
                      QStyleOptionViewItem option,
                      const QModelIndex &index)
{
    QImage image(option.rect.size(), QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::transparent);
    option.rect.moveTopLeft(QPoint());
    QPainter painter(&image);
    delegate->paint(&painter, option, index);
    painter.end();
    return image;
}

QImage renderWidget(QWidget *widget)
{
    QImage image(widget->size(), QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    widget->render(&painter);
    painter.end();
    return image;
}

} // namespace

void SignalBenchTest::identityConstitutionsDifferBeyondPalette()
{
    const auto precision = themeFor(Identity::Precision);
    const auto rack = themeFor(Identity::Rack);

    QVERIFY(precision.canvas != rack.canvas);
    QVERIFY(precision.rowHeight != rack.rowHeight);
    QVERIFY(precision.spacing != rack.spacing);
    QVERIFY(precision.radius != rack.radius);
    QVERIFY(precision.depthLayers != rack.depthLayers);
    QVERIFY(precision.pickerKind != rack.pickerKind);
    QVERIFY(precision.graphGrammar != rack.graphGrammar);
    QVERIFY(precision.dialGrammar != rack.dialGrammar);
    QVERIFY(!precision.contentStyleSheet().isEmpty());
    QVERIFY(!rack.contentStyleSheet().isEmpty());
}

void SignalBenchTest::pickerFactoryCreatesDistinctStructures()
{
    SessionModel session;
    std::unique_ptr<QAbstractItemView> precision(createPresetPicker(
        Identity::Precision, session.presetModel(), session.presetSelection()));
    std::unique_ptr<QAbstractItemView> rack(createPresetPicker(
        Identity::Rack, session.presetModel(), session.presetSelection()));

    QVERIFY(qobject_cast<QTableView *>(precision.get()));
    QVERIFY(qobject_cast<QListView *>(rack.get()));
}

void SignalBenchTest::pickerFactorySharesModelAndSelection()
{
    SessionModel session;
    QPointer<QItemSelectionModel> selection(session.presetSelection());
    for (const Identity identity : {Identity::Precision, Identity::Rack}) {
        auto *view = createPresetPicker(
            identity, session.presetModel(), session.presetSelection());
        QVERIFY(view);
        QCOMPARE(view->model(), session.presetModel());
        QCOMPARE(view->selectionModel(), session.presetSelection());
        delete view;
        QVERIFY(selection);
        QCOMPARE(selection->model(), session.presetModel());
    }
}

void SignalBenchTest::noSelectionDisablesPresetActivation()
{
    SignalBenchWindow window;
    auto *selection = window.sessionModel()->presetSelection();
    auto *button = window.findChild<QPushButton *>();
    auto *status = window.findChild<QLabel *>(QStringLiteral("StatusLabel"));
    const QModelIndex current = window.sessionModel()->presetModel()->index(2, 0);
    QVERIFY(selection);
    QVERIFY(button);
    QVERIFY(status);

    selection->clearSelection();
    selection->setCurrentIndex(current, QItemSelectionModel::NoUpdate);
    QCOMPARE(selection->selectedRows().size(), 0);
    QCOMPARE(selection->currentIndex(), current);
    QVERIFY(!window.presetAction()->isEnabled());
    QVERIFY(!button->isEnabled());
    QVERIFY(status->text().contains(QStringLiteral("No preset selected")));
    QVERIFY(window.sessionSnapshot().startsWith(QByteArray("preset=none;")));

    QSignalSpy activated(&window, &SignalBenchWindow::presetActivated);
    window.activateCurrentPreset();
    QCOMPARE(activated.count(), 0);

    const QByteArray snapshot = window.sessionSnapshot();
    QVERIFY(window.setIdentity(Identity::Rack));
    QCOMPARE(selection->selectedRows().size(), 0);
    QCOMPARE(selection->currentIndex(), current);
    QCOMPARE(window.sessionSnapshot(), snapshot);
    QVERIFY(!window.presetAction()->isEnabled());

    selection->select(current, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    QVERIFY(selection->isSelected(current));
    QVERIFY(window.presetAction()->isEnabled());
    QVERIFY(button->isEnabled());
    QVERIFY(status->text().contains(QStringLiteral("Night Console selected")));
    QVERIFY(window.sessionSnapshot().startsWith(QByteArray("preset=2;")));
    window.activateCurrentPreset();
    QCOMPARE(activated.count(), 1);
}

void SignalBenchTest::identitySwitchRoundTripPreservesState()
{
    SignalBenchWindow window;
    window.resize(1280, 800);
    window.show();
    QVERIFY(QTest::qWaitForWindowExposed(&window));

    auto *model = window.sessionModel();
    auto *selection = model ? model->presetSelection() : nullptr;
    auto *action = window.presetAction();
    auto *picker = window.pickerView();
    const auto dials = window.dials();
    QVERIFY(model);
    QVERIFY(selection);
    QVERIFY(action);
    QVERIFY(picker);
    QVERIFY(!dials.isEmpty());
    QCOMPARE(picker->visualRect(model->presetModel()->index(0, 0)).height(), 34);

    picker->parentWidget()->setFixedHeight(120);
    QApplication::processEvents();
    const QModelIndex selected = model->presetModel()->index(3, 0);
    const QModelIndex requestedTop = model->presetModel()->index(2, 0);
    selection->setCurrentIndex(selected, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    picker->scrollTo(requestedTop, QAbstractItemView::PositionAtTop);
    QApplication::processEvents();
    QVERIFY(picker->verticalScrollBar()->maximum() > 0);
    QVERIFY(picker->verticalScrollBar()->value() > 0);
    const int initialScrollValue = picker->verticalScrollBar()->value();
    const QPersistentModelIndex topAnchor(picker->indexAt(QPoint(4, 4)));
    QVERIFY(topAnchor.isValid());
    const int topOffset = -picker->visualRect(topAnchor).top();
    picker->setFocus();
    dials.first()->setValue(7);
    const QByteArray snapshot = window.sessionSnapshot();
    const QList<int> splitterSizes = window.splitterSizes();

    QVERIFY(window.setIdentity(Identity::Rack));
    QVERIFY(window.pickerView()->isVisible());
    QVERIFY(window.pickerView()->hasFocus());
    QApplication::processEvents();
    QCOMPARE(window.pickerView()->visualRect(model->presetModel()->index(0, 0)).height(), 50);
    QVERIFY(window.pickerView()->verticalScrollBar()->maximum() > 0);
    QVERIFY(window.pickerView()->verticalScrollBar()->value() > 0);
    QCOMPARE(window.pickerView()->indexAt(QPoint(4, 4)), QModelIndex(topAnchor));
    QVERIFY(window.setIdentity(Identity::Precision));
    QApplication::processEvents();
    QCOMPARE(window.pickerView()->verticalScrollBar()->value(), initialScrollValue);
    QCOMPARE(window.pickerView()->indexAt(QPoint(4, 4)), QModelIndex(topAnchor));
    QCOMPARE(-window.pickerView()->visualRect(topAnchor).top(), topOffset);

    QCOMPARE(window.sessionModel(), model);
    QCOMPARE(model->presetSelection(), selection);
    QCOMPARE(window.presetAction(), action);
    QCOMPARE(window.dials().first(), dials.first());
    QCOMPARE(selection->currentIndex(), selected);
    QCOMPARE(dials.first()->value(), 7);
    QCOMPARE(window.splitterSizes(), splitterSizes);
    QCOMPARE(window.sessionSnapshot(), snapshot);
    QVERIFY(window.pickerView()->hasFocus());
}

void SignalBenchTest::identitySwitchRestoresTabOrder()
{
    SignalBenchWindow window;
    window.show();
    QVERIFY(QTest::qWaitForWindowExposed(&window));
    auto *selector = window.findChild<QComboBox *>();
    auto *button = window.findChild<QPushButton *>();
    QVERIFY(selector);
    QVERIFY(button);

    for (const Identity identity : {Identity::Rack, Identity::Precision}) {
        QVERIFY(window.setIdentity(identity));
        selector->setFocus();
        QTest::keyClick(selector, Qt::Key_Tab);
        QVERIFY(window.pickerView()->hasFocus());
        QTest::keyClick(window.pickerView(), Qt::Key_Tab);
        QVERIFY(button->hasFocus());
        QTest::keyClick(button, Qt::Key_Tab);
        QVERIFY(window.bandTable()->hasFocus());
        QTest::keyClick(window.bandTable(), Qt::Key_Tab, Qt::ShiftModifier);
        QVERIFY(button->hasFocus());
    }
}

void SignalBenchTest::sameIdentitySwitchIsNoOp()
{
    SignalBenchWindow window;
    auto *picker = window.pickerView();
    const QByteArray snapshot = window.sessionSnapshot();
    QSignalSpy changed(&window, &SignalBenchWindow::identityChanged);

    QVERIFY(!window.setIdentity(window.identity()));
    QCOMPARE(window.pickerView(), picker);
    QCOMPARE(window.sessionSnapshot(), snapshot);
    QCOMPARE(changed.count(), 0);
}

void SignalBenchTest::delegateMetricsFollowIdentity()
{
    SessionModel session;
    const QModelIndex bandIndex = session.bandModel()->index(0, 0);
    const QModelIndex koreanPreset = session.presetModel()->index(3, 0);
    session.presetModel()->setData(
        koreanPreset,
        QStringLiteral("A deliberately long English subtitle beside 한국어 and emoji 🎧"),
        SessionModel::SubtitleRole);
    QStyleOptionViewItem option;
    option.rect = QRect(0, 0, 460, 80);
    option.direction = Qt::RightToLeft;
    option.state = QStyle::State_Enabled | QStyle::State_Active
        | QStyle::State_Selected | QStyle::State_HasFocus;

    BandDelegate delegate(Identity::Precision);
    QCOMPARE(delegate.sizeHint(option, bandIndex).height(), 34);
    delegate.setIdentity(Identity::Rack);
    QCOMPARE(delegate.sizeHint(option, bandIndex).height(), 50);
    QVERIFY(delegate.sizeHint(option, bandIndex).width() > 0);

    QStyleOptionViewItem enlarged(option);
    enlarged.font = QApplication::font();
    enlarged.font.setPointSizeF(enlarged.font.pointSizeF() * 2.0);
    enlarged.fontMetrics = QFontMetrics(enlarged.font);
    enlarged.rect.setHeight(120);
    delegate.setIdentity(Identity::Precision);
    const int requiredTextHeight = enlarged.fontMetrics.height()
        + qMax(8, enlarged.fontMetrics.height() - 2) + 4;
    QVERIFY(delegate.sizeHint(enlarged, koreanPreset).height() >= requiredTextHeight);
    QImage image(enlarged.rect.size(), QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::magenta);
    const QImage before = image;
    QPainter painter(&image);
    delegate.paint(&painter, enlarged, koreanPreset);
    painter.end();
    QVERIFY(image != before);
    delegate.setIdentity(Identity::Rack);
    QVERIFY(delegate.sizeHint(enlarged, koreanPreset).height() >= requiredTextHeight);
}

void SignalBenchTest::delegatePaintUsesActiveInactiveAndDisabledGroups()
{
    SessionModel session;
    BandDelegate delegate(Identity::Precision);
    const QModelIndex index = session.presetModel()->index(2, 0);
    QStyleOptionViewItem option;
    option.rect = QRect(0, 0, 320, 60);
    option.font = QApplication::font();
    option.fontMetrics = QFontMetrics(option.font);
    option.palette = QApplication::palette();
    const QColor activeHighlight(QStringLiteral("#ff1744"));
    const QColor inactiveHighlight(QStringLiteral("#00c853"));
    const QColor disabledHighlight(QStringLiteral("#304ffe"));
    option.palette.setColor(QPalette::Active, QPalette::Highlight, activeHighlight);
    option.palette.setColor(QPalette::Inactive, QPalette::Highlight, inactiveHighlight);
    option.palette.setColor(QPalette::Disabled, QPalette::Highlight, disabledHighlight);

    option.state = QStyle::State_Enabled | QStyle::State_Active
        | QStyle::State_Selected;
    const QImage active = renderDelegate(&delegate, option, index);
    QCOMPARE(active.pixelColor(1, active.height() / 2), activeHighlight);
    option.state &= ~QStyle::State_Active;
    const QImage inactive = renderDelegate(&delegate, option, index);
    QCOMPARE(inactive.pixelColor(1, inactive.height() / 2), inactiveHighlight);
    QVERIFY(active != inactive);

    option.state = QStyle::State_Active | QStyle::State_Selected;
    const QImage disabledActive = renderDelegate(&delegate, option, index);
    QCOMPARE(disabledActive.pixelColor(1, disabledActive.height() / 2), disabledHighlight);
    option.state &= ~QStyle::State_Active;
    const QImage disabledInactive = renderDelegate(&delegate, option, index);
    QCOMPARE(disabledActive, disabledInactive);
    QVERIFY(disabledActive != inactive);
}

void SignalBenchTest::dialPaintUsesActiveInactiveAndDisabledGroups()
{
    SignalBenchWindow window;
    QVERIFY(window.setIdentity(Identity::Rack));
    window.resize(1100, 700);
    window.show();
    QVERIFY(QTest::qWaitForWindowExposed(&window));
    window.activateWindow();
    QTRY_VERIFY(window.isActiveWindow());
    SignalDial *dial = window.dials().constFirst();
    QPalette palette = dial->palette();
    const QColor activeLink(QStringLiteral("#ff1744"));
    const QColor inactiveLink(QStringLiteral("#00c853"));
    const QColor disabledLink(QStringLiteral("#304ffe"));
    palette.setColor(QPalette::Active, QPalette::Link, activeLink);
    palette.setColor(QPalette::Inactive, QPalette::Link, inactiveLink);
    palette.setColor(QPalette::Disabled, QPalette::Link, disabledLink);
    dial->setPalette(palette);
    dial->clearFocus();
    QApplication::processEvents();
    const QImage active = renderWidget(dial);
    const QPoint center(dial->width() / 2, dial->height() / 2);
    QCOMPARE(active.pixelColor(center), activeLink);

    QWidget blocker;
    blocker.resize(120, 80);
    blocker.show();
    QVERIFY(QTest::qWaitForWindowExposed(&blocker));
    blocker.activateWindow();
    QTRY_VERIFY(blocker.isActiveWindow());
    QApplication::processEvents();
    const QImage inactive = renderWidget(dial);
    QCOMPARE(inactive.pixelColor(center), inactiveLink);
    QVERIFY(active != inactive);

    dial->setEnabled(false);
    QApplication::processEvents();
    const QImage disabledInactive = renderWidget(dial);
    QCOMPARE(disabledInactive.pixelColor(center), disabledLink);
    window.activateWindow();
    QTRY_VERIFY(window.isActiveWindow());
    QApplication::processEvents();
    const QImage disabledActive = renderWidget(dial);
    QCOMPARE(disabledActive, disabledInactive);
}

void SignalBenchTest::identityPaletteIsAppliedAtWidgetBoundaries()
{
    SignalBenchWindow window;
    for (const Identity identity : {Identity::Precision, Identity::Rack}) {
        if (window.identity() != identity) {
            QVERIFY(window.setIdentity(identity));
        }
        const auto theme = themeFor(identity);
        const QList<QWidget *> paintedWidgets = {
            window.pickerView(), window.bandTable(), window.dials().constFirst()};
        for (QWidget *widget : paintedWidgets) {
            const QPalette palette = widget->palette();
            QCOMPARE(palette.color(QPalette::Active, QPalette::Highlight), theme.accent);
            QCOMPARE(palette.color(QPalette::Inactive, QPalette::Highlight), theme.muted);
            QCOMPARE(palette.color(QPalette::Disabled, QPalette::Highlight), theme.muted);
            QCOMPARE(palette.color(QPalette::Active, QPalette::Link), theme.trace);
            QCOMPARE(palette.color(QPalette::Inactive, QPalette::Link), theme.muted);
            QCOMPARE(palette.color(QPalette::Disabled, QPalette::Text), theme.muted);
        }
    }
}

void SignalBenchTest::enlargedTextAndRtlRemainRenderable()
{
    struct FontRestorer {
        QFont original;
        ~FontRestorer() { QApplication::setFont(original); }
    } fontRestorer{QApplication::font()};
    QFont enlarged = fontRestorer.original;
    enlarged.setPointSizeF(enlarged.pointSizeF() * 1.6);
    QApplication::setFont(enlarged);
    SignalBenchWindow window;
    window.setLayoutDirection(Qt::RightToLeft);
    window.resize(1280, 800);
    window.show();
    QVERIFY(QTest::qWaitForWindowExposed(&window));
    const QModelIndex koreanPreset = window.sessionModel()->presetModel()->index(3, 0);

    for (const Identity identity : {Identity::Precision, Identity::Rack}) {
        if (window.identity() != identity) {
            QVERIFY(window.setIdentity(identity));
        }
        window.pickerView()->scrollTo(koreanPreset);
        QApplication::processEvents();
        QCOMPARE(window.pickerView()->layoutDirection(), Qt::RightToLeft);
        const int renderedRowHeight = window.pickerView()->visualRect(koreanPreset).height();
        QStyleOptionViewItem rowOption;
        rowOption.initFrom(window.pickerView());
        rowOption.font = window.pickerView()->font();
        rowOption.fontMetrics = QFontMetrics(rowOption.font);
        const int delegateRowHeight = window.pickerView()->itemDelegate()
            ->sizeHint(rowOption, koreanPreset).height();
        const int requiredTextHeight = rowOption.fontMetrics.height()
            + qMax(8, rowOption.fontMetrics.height() - 2) + 4;
        QCOMPARE(renderedRowHeight, delegateRowHeight);
        QVERIFY(renderedRowHeight >= requiredTextHeight);
        QVERIFY(!window.hasUnexpectedHorizontalScrollbars());
    }

    QImage rendered(window.size(), QImage::Format_RGB32);
    rendered.fill(Qt::magenta);
    QPainter painter(&rendered);
    window.render(&painter);
    painter.end();
    QVERIFY(rendered.pixelColor(rendered.rect().center()) != QColor(Qt::magenta));
}

void SignalBenchTest::presetActivationUsesSharedActionExactlyOnce()
{
    SignalBenchWindow window;
    window.show();
    auto *picker = window.pickerView();
    QVERIFY(picker);
    picker->setFocus();
    QSignalSpy activated(&window, &SignalBenchWindow::presetActivated);

    window.activateCurrentPreset();
    QCOMPARE(activated.count(), 1);
    QTest::keyClick(picker, Qt::Key_Return);
    QCOMPARE(activated.count(), 2);
    const QRect itemRect = picker->visualRect(picker->currentIndex());
    QVERIFY(itemRect.isValid());
    QTest::mouseClick(picker->viewport(), Qt::LeftButton, Qt::NoModifier, itemRect.center());
    QCOMPARE(activated.count(), 2);
    QTest::mouseDClick(picker->viewport(), Qt::LeftButton, Qt::NoModifier, itemRect.center());
    QTest::mouseRelease(picker->viewport(), Qt::LeftButton, Qt::NoModifier, itemRect.center());
    QCOMPARE(activated.count(), 3);

    QVERIFY(window.setIdentity(Identity::Rack));
    picker = window.pickerView();
    picker->setFocus();
    QTest::keyClick(picker, Qt::Key_Return);
    QCOMPARE(activated.count(), 4);
}

void SignalBenchTest::identitySwitchPreservesBandEditor()
{
    SignalBenchWindow window;
    window.show();
    QVERIFY(QTest::qWaitForWindowExposed(&window));
    const QModelIndex index = window.sessionModel()->bandModel()->index(1, 1);
    window.bandTable()->setCurrentIndex(index);
    window.bandTable()->edit(index);
    QTRY_VERIFY(window.bandTable()->findChild<QLineEdit *>());
    auto *editor = window.bandTable()->findChild<QLineEdit *>();
    QVERIFY(editor->isVisible());
    editor->setText(QStringLiteral("880 Hz"));
    editor->setFocus();

    QVERIFY(window.setIdentity(Identity::Rack));
    QCOMPARE(window.bandTable()->findChild<QLineEdit *>(), editor);
    QCOMPARE(editor->text(), QStringLiteral("880 Hz"));
    QVERIFY(editor->hasFocus());
}

void SignalBenchTest::dialKeyboardAndAccessibilitySurviveSwitch()
{
    SignalBenchWindow window;
    const auto dials = window.dials();
    QVERIFY(!dials.isEmpty());
    auto *dial = dials.first();
    dial->setValue(0);
    dial->setFocus();
    QTest::keyClick(dial, Qt::Key_Up);
    QCOMPARE(dial->value(), dial->singleStep());

    auto *iface = QAccessible::queryAccessibleInterface(dial);
    QVERIFY(iface);
    QCOMPARE(iface->role(), QAccessible::Dial);
    QCOMPARE(iface->text(QAccessible::Name), QStringLiteral("Input gain"));
    QVERIFY(iface->text(QAccessible::Description).contains(QStringLiteral("Signal Bench")));
    auto *value = iface->valueInterface();
    QVERIFY(value);
    QCOMPARE(value->currentValue().toInt(), dial->value());
    QCOMPARE(value->minimumValue().toInt(), dial->minimum());
    QCOMPARE(value->maximumValue().toInt(), dial->maximum());
    QCOMPARE(value->minimumStepSize().toInt(), dial->singleStep());
    auto *actions = iface->actionInterface();
    QVERIFY(actions);
    QVERIFY(actions->actionNames().contains(QAccessibleActionInterface::setFocusAction()));
    const int valueBeforeAction = dial->value();
    value->setCurrentValue(valueBeforeAction + dial->singleStep());
    QCOMPARE(dial->value(), valueBeforeAction + dial->singleStep());

    QVERIFY(window.setIdentity(Identity::Rack));
    QCOMPARE(window.dials().first(), dial);
    auto *rackInterface = QAccessible::queryAccessibleInterface(dial);
    QCOMPARE(rackInterface->role(), QAccessible::Dial);
    QVERIFY(rackInterface->actionInterface()->actionNames().contains(
        QAccessibleActionInterface::setFocusAction()));
    QCOMPARE(rackInterface->valueInterface()->minimumStepSize().toInt(), dial->singleStep());
}

void SignalBenchTest::graphAccessibilityIsInformational()
{
    SignalBenchWindow window;
    auto *graph = window.responseGraph();
    QVERIFY(graph);
    auto *iface = QAccessible::queryAccessibleInterface(graph);
    QVERIFY(iface);
    QCOMPARE(iface->role(), QAccessible::Client);
    QCOMPARE(iface->text(QAccessible::Name), QStringLiteral("Frequency response graph"));
    QVERIFY(iface->text(QAccessible::Description).contains(QStringLiteral("six filter bands")));
    QVERIFY(!iface->valueInterface());
    auto *actions = iface->actionInterface();
    QVERIFY(!actions || actions->actionNames().isEmpty());
}

void SignalBenchTest::galleryWritesExactMatrix()
{
    QTemporaryDir directory;
    QVERIFY(directory.isValid());
    SignalBenchWindow window;
    QString error;

    QVERIFY2(window.writeGallery(directory.path(), &error), qPrintable(error));
    const QStringList expected = SignalBenchWindow::galleryFileNames();
    QCOMPARE(expected.size(), 8);

    QDir output(directory.path());
    QCOMPARE(output.entryList({QStringLiteral("*.png")}, QDir::Files, QDir::Name), expected);
    for (const QString &name : expected) {
        QImage image(output.filePath(name));
        QVERIFY2(!image.isNull(), qPrintable(name));
        QCOMPARE(image.size(), QSize(1280, 800));
        image = image.convertToFormat(QImage::Format_ARGB32);
        qint64 nearBlackPixels = 0;
        for (int y = 0; y < image.height(); ++y) {
            const auto *pixels = reinterpret_cast<const QRgb *>(image.constScanLine(y));
            for (int x = 0; x < image.width(); ++x) {
                QVERIFY2(qAlpha(pixels[x]) == 255, qPrintable(name));
                if (qRed(pixels[x]) < 5 && qGreen(pixels[x]) < 5 && qBlue(pixels[x]) < 5) {
                    ++nearBlackPixels;
                }
            }
        }
        QVERIFY2(nearBlackPixels < image.width() * image.height() / 50, qPrintable(name));
    }
    for (const QString &identity : {QStringLiteral("precision"), QStringLiteral("rack")}) {
        const QImage normal(output.filePath(identity + QStringLiteral("_normal.png")));
        const QImage focused(output.filePath(identity + QStringLiteral("_focused.png")));
        const QImage selected(output.filePath(identity + QStringLiteral("_selected.png")));
        const QImage disabled(output.filePath(identity + QStringLiteral("_disabled.png")));
        QVERIFY(normal != focused);
        QVERIFY(normal != selected);
        QVERIFY(normal != disabled);
    }
    QVERIFY(!window.hasUnexpectedHorizontalScrollbars());
}

void SignalBenchTest::galleryValidatorRejectsTransparentPixels()
{
    QTemporaryDir directory;
    QVERIFY(directory.isValid());
    const QStringList fileNames = SignalBenchWindow::galleryFileNames();
    for (const QString &fileName : fileNames) {
        QImage image(QSize(1280, 800), QImage::Format_ARGB32);
        image.fill(qRgba(31, 37, 44, 255));
        QVERIFY2(image.save(QDir(directory.path()).filePath(fileName), "PNG"),
                 qPrintable(fileName));
    }
    const QString transparentPath = QDir(directory.path()).filePath(fileNames.constFirst());
    QImage transparent(transparentPath);
    transparent.setPixelColor(0, 0, QColor(31, 37, 44, 254));
    QVERIFY(transparent.save(transparentPath, "PNG"));

    QString error;
    QVERIFY(!SignalBenchWindow::validateGalleryArtifacts(directory.path(), &error));
    QVERIFY2(error.contains(QStringLiteral("alpha"), Qt::CaseInsensitive), qPrintable(error));

    transparent.setPixelColor(0, 0, QColor(31, 37, 44, 255));
    QVERIFY(transparent.save(transparentPath, "PNG"));
    QVERIFY2(SignalBenchWindow::validateGalleryArtifacts(directory.path(), &error),
             qPrintable(error));
    QVERIFY(error.isEmpty());
}

void SignalBenchTest::galleryCliIgnoresConflictingCallerEnvironment()
{
    QTemporaryDir root;
    QVERIFY(root.isValid());
    const QString executable = signalBenchExecutable();
    QVERIFY2(QFileInfo::exists(executable), qPrintable(executable));
    const QString baselinePath = QDir(root.path()).filePath(QStringLiteral("baseline"));
    const QString hostilePath = QDir(root.path()).filePath(QStringLiteral("hostile"));

    QProcessEnvironment baseline = QProcessEnvironment::systemEnvironment();
    baseline.insert(QStringLiteral("QT_QPA_PLATFORM"), QStringLiteral("offscreen"));
    baseline.insert(QStringLiteral("QT_SCALE_FACTOR"), QStringLiteral("1"));
    baseline.insert(QStringLiteral("QT_SCREEN_SCALE_FACTORS"), QStringLiteral("1"));
    baseline.insert(QStringLiteral("QT_FONT_DPI"), QStringLiteral("96"));
    baseline.insert(QStringLiteral("QT_STYLE_OVERRIDE"), QStringLiteral("Fusion"));
    baseline.insert(QStringLiteral("LC_ALL"), QStringLiteral("en_US.UTF-8"));
    baseline.insert(QStringLiteral("LANG"), QStringLiteral("en_US.UTF-8"));

    QProcessEnvironment hostile = baseline;
    hostile.insert(QStringLiteral("QT_QPA_PLATFORM"), QStringLiteral("signalbench-invalid-platform"));
    hostile.insert(QStringLiteral("QT_SCALE_FACTOR"), QStringLiteral("2"));
    hostile.insert(QStringLiteral("QT_SCREEN_SCALE_FACTORS"), QStringLiteral("2"));
    hostile.insert(QStringLiteral("QT_FONT_DPI"), QStringLiteral("192"));
    hostile.insert(QStringLiteral("QT_STYLE_OVERRIDE"), QStringLiteral("Windows"));
    hostile.insert(QStringLiteral("LC_ALL"), QStringLiteral("C"));
    hostile.insert(QStringLiteral("LANG"), QStringLiteral("C"));

    QString error = runGalleryProcess(executable, baselinePath, baseline);
    QVERIFY2(error.isEmpty(), qPrintable(error));
    error = runGalleryProcess(executable, hostilePath, hostile, true);
    QVERIFY2(error.isEmpty(), qPrintable(error));

    for (const QString &fileName : SignalBenchWindow::galleryFileNames()) {
        QFile baselineFile(QDir(baselinePath).filePath(fileName));
        QFile hostileFile(QDir(hostilePath).filePath(fileName));
        QVERIFY2(baselineFile.open(QIODevice::ReadOnly), qPrintable(baselineFile.fileName()));
        QVERIFY2(hostileFile.open(QIODevice::ReadOnly), qPrintable(hostileFile.fileName()));
        QCOMPARE(hostileFile.readAll(), baselineFile.readAll());
    }
}

void SignalBenchTest::galleryFailureRestoresWindowState()
{
    QTemporaryDir directory;
    QVERIFY(directory.isValid());
    QVERIFY(QDir(directory.path()).mkdir(QStringLiteral("precision_normal.png")));
    SignalBenchWindow window;
    window.resize(1100, 700);
    window.show();
    QVERIFY(QTest::qWaitForWindowExposed(&window));
    QVERIFY(window.setIdentity(Identity::Rack));
    const QModelIndex selected = window.sessionModel()->presetModel()->index(4, 0);
    window.sessionModel()->presetSelection()->setCurrentIndex(
        selected, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    window.dials().first()->setValue(6);
    window.dials().first()->setFocus();
    const QByteArray snapshot = window.sessionSnapshot();
    QString error;

    QVERIFY(!window.writeGallery(directory.path(), &error));
    QVERIFY(!error.isEmpty());
    QCOMPARE(window.identity(), Identity::Rack);
    QCOMPARE(window.size(), QSize(1100, 700));
    QCOMPARE(window.sessionSnapshot(), snapshot);
    QCOMPARE(window.sessionModel()->presetSelection()->currentIndex(), selected);
    QVERIFY(window.dials().first()->hasFocus());
    QVERIFY(window.isVisible());
}

void SignalBenchTest::galleryIgnoresCallerState()
{
    QTemporaryDir baselineDirectory;
    QTemporaryDir mutatedDirectory;
    QVERIFY(baselineDirectory.isValid());
    QVERIFY(mutatedDirectory.isValid());
    SignalBenchWindow window;
    QString error;
    QVERIFY2(window.writeGallery(baselineDirectory.path(), &error), qPrintable(error));

    QVERIFY(window.setIdentity(Identity::Rack));
    window.sessionModel()->bandModel()->setData(
        window.sessionModel()->bandModel()->index(0, 1), QStringLiteral("MUTATED"));
    window.sessionModel()->presetSelection()->setCurrentIndex(
        window.sessionModel()->presetModel()->index(5, 0),
        QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    window.dials().first()->setValue(window.dials().first()->maximum());
    window.findChild<QSplitter *>()->setSizes({400, 400, 400});
    QVERIFY2(window.writeGallery(mutatedDirectory.path(), &error), qPrintable(error));

    for (const QString &name : SignalBenchWindow::galleryFileNames()) {
        const QImage baseline(QDir(baselineDirectory.path()).filePath(name));
        const QImage mutated(QDir(mutatedDirectory.path()).filePath(name));
        QVERIFY2(!baseline.isNull(), qPrintable(name));
        QCOMPARE(mutated, baseline);
    }
}

void SignalBenchTest::minimumSizeHasNoUnexpectedHorizontalScrollbars()
{
    SignalBenchWindow window;
    window.resize(window.minimumSize());
    window.show();
    QVERIFY(QTest::qWaitForWindowExposed(&window));
    QCOMPARE(window.size(), QSize(1000, 680));
    QVERIFY(!window.hasUnexpectedHorizontalScrollbars());
    QVERIFY(window.setIdentity(Identity::Rack));
    QApplication::processEvents();
    QVERIFY(!window.hasUnexpectedHorizontalScrollbars());
}

QTEST_MAIN(SignalBenchTest)

#include "tst_signalbench.moc"

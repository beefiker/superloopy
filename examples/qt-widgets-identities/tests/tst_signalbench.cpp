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
#include <QImage>
#include <QItemSelectionModel>
#include <QListView>
#include <QLineEdit>
#include <QPainter>
#include <QPersistentModelIndex>
#include <QPointer>
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
    void identitySwitchRoundTripPreservesState();
    void identitySwitchRestoresTabOrder();
    void sameIdentitySwitchIsNoOp();
    void delegateMetricsFollowIdentity();
    void enlargedTextAndRtlRemainRenderable();
    void presetActivationUsesSharedActionExactlyOnce();
    void identitySwitchPreservesBandEditor();
    void dialKeyboardAndAccessibilitySurviveSwitch();
    void graphAccessibilityIsInformational();
    void galleryWritesExactMatrix();
    void galleryFailureRestoresWindowState();
    void galleryIgnoresCallerState();
    void minimumSizeHasNoUnexpectedHorizontalScrollbars();
};

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
    option.state = QStyle::State_Enabled | QStyle::State_Selected | QStyle::State_HasFocus;

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

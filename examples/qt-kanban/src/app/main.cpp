#include <cstdlib>

#include <QtCore/QCommandLineOption>
#include <QtCore/QCommandLineParser>
#include <QtCore/QCoreApplication>
#include <QtCore/QDebug>
#include <QtCore/QMetaObject>
#include <QtCore/QRegularExpression>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlApplicationEngine>
#include <QtQuick/QQuickWindow>
#include <QtQuickControls2/QQuickStyle>

int main(int argc, char *argv[])
{
    QGuiApplication application(argc, argv);

    QCoreApplication::setApplicationName(QStringLiteral("Northstar"));
    QGuiApplication::setApplicationDisplayName(QStringLiteral("Northstar"));
    QQuickStyle::setStyle(QStringLiteral("Basic"));

    QCommandLineParser parser;
    parser.setApplicationDescription(QStringLiteral("Northstar Kanban"));
    parser.addHelpOption();
    const QCommandLineOption windowSizeOption(
        QStringLiteral("window-size"),
        QStringLiteral("Set the initial window size as WIDTHxHEIGHT."),
        QStringLiteral("WIDTHxHEIGHT"),
        QStringLiteral("1600x1000"));
    const QCommandLineOption quitAfterReadyOption(
        QStringLiteral("quit-after-ready"),
        QStringLiteral("Quit after the first rendered frame."));
    parser.addOption(windowSizeOption);
    parser.addOption(quitAfterReadyOption);
    parser.process(application);

    const QString requestedSize = parser.value(windowSizeOption);
    const QRegularExpressionMatch sizeMatch =
        QRegularExpression(QStringLiteral("^(\\d+)x(\\d+)$")).match(requestedSize);
    if (!sizeMatch.hasMatch()) {
        qCritical().noquote()
            << QStringLiteral("Invalid window size '%1'; expected WIDTHxHEIGHT.")
                   .arg(requestedSize);
        return EXIT_FAILURE;
    }

    bool widthOk = false;
    bool heightOk = false;
    const int initialWidth = sizeMatch.captured(1).toInt(&widthOk);
    const int initialHeight = sizeMatch.captured(2).toInt(&heightOk);
    if (!widthOk || !heightOk || initialWidth < 900 || initialHeight < 640) {
        qCritical().noquote()
            << QStringLiteral("Window size must be at least 900x640; received %1.")
                   .arg(requestedSize);
        return EXIT_FAILURE;
    }

    QQmlApplicationEngine engine;
    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &application,
        []() { QCoreApplication::exit(EXIT_FAILURE); },
        Qt::QueuedConnection);
    engine.setInitialProperties({
        {QStringLiteral("initialWidth"), initialWidth},
        {QStringLiteral("initialHeight"), initialHeight},
    });
    engine.loadFromModule("Northstar.Kanban", "Main");

    if (engine.rootObjects().isEmpty()) {
        return EXIT_FAILURE;
    }

    auto *window = qobject_cast<QQuickWindow *>(engine.rootObjects().constFirst());
    if (!window) {
        qCritical() << "Northstar root object is not a QQuickWindow.";
        return EXIT_FAILURE;
    }

    const bool quitAfterReady = parser.isSet(quitAfterReadyOption);
    QObject::connect(
        window,
        &QQuickWindow::afterRendering,
        window,
        [&application, initialWidth, initialHeight, quitAfterReady]() {
            QMetaObject::invokeMethod(
                &application,
                [&application, initialWidth, initialHeight, quitAfterReady]() {
                    qInfo().noquote()
                        << QStringLiteral("NORTHSTAR_READY %1x%2")
                               .arg(initialWidth)
                               .arg(initialHeight);
                    if (quitAfterReady) {
                        application.quit();
                    }
                },
                Qt::QueuedConnection);
        },
        static_cast<Qt::ConnectionType>(Qt::DirectConnection |
                                        Qt::SingleShotConnection));

    return application.exec();
}

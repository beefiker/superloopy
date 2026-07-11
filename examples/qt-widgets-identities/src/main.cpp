#include "SignalBenchWindow.h"

#include <QApplication>
#include <QCommandLineOption>
#include <QCommandLineParser>
#include <QLocale>
#include <QTextStream>
#include <QTimer>

using namespace SignalBench;

namespace {

bool requestsGallery(int argc, char *argv[])
{
    for (int index = 1; index < argc; ++index) {
        const QByteArray argument(argv[index]);
        if (argument == QByteArrayLiteral("--")) {
            return false;
        }
        if (argument == QByteArrayLiteral("--gallery")
            || argument.startsWith(QByteArrayLiteral("--gallery="))) {
            return true;
        }
    }
    return false;
}

void pinGalleryEnvironment()
{
    qputenv("QT_QPA_PLATFORM", QByteArrayLiteral("offscreen"));
    qputenv("QT_SCALE_FACTOR", QByteArrayLiteral("1"));
    qputenv("QT_SCREEN_SCALE_FACTORS", QByteArrayLiteral("1"));
    qputenv("QT_FONT_DPI", QByteArrayLiteral("96"));
    qputenv("QT_STYLE_OVERRIDE", QByteArrayLiteral("Fusion"));
    qputenv("QT_OPENGL", QByteArrayLiteral("software"));
    qputenv("LC_ALL", QByteArrayLiteral("en_US.UTF-8"));
    qputenv("LANG", QByteArrayLiteral("en_US.UTF-8"));
    QLocale::setDefault(QLocale(QLocale::English, QLocale::UnitedStates));
}

} // namespace

int main(int argc, char *argv[])
{
    if (requestsGallery(argc, argv)) {
        pinGalleryEnvironment();
    }
    QApplication application(argc, argv);
    QCoreApplication::setApplicationName(QStringLiteral("qtwidgetsidentities"));
    QCoreApplication::setApplicationVersion(QStringLiteral("0.1"));
    QCoreApplication::setOrganizationName(QStringLiteral("Superloopy"));

    QCommandLineParser parser;
    parser.setApplicationDescription(
        QStringLiteral("Signal Bench Qt Widgets identity acceptance fixture"));
    parser.addHelpOption();
    parser.addVersionOption();
    QCommandLineOption galleryOption(
        QStringLiteral("gallery"),
        QStringLiteral("Write the deterministic eight-image gallery to <directory>."),
        QStringLiteral("directory"));
    QCommandLineOption identityOption(
        QStringLiteral("identity"),
        QStringLiteral("Start with the precision or rack identity."),
        QStringLiteral("identity"), QStringLiteral("precision"));
    QCommandLineOption windowSizeOption(
        QStringLiteral("window-size"),
        QStringLiteral("Set the client size to WIDTHxHEIGHT."),
        QStringLiteral("WIDTHxHEIGHT"), QStringLiteral("1280x800"));
    QCommandLineOption quitAfterReadyOption(
        QStringLiteral("quit-after-ready"),
        QStringLiteral("Exit after the first settled event-loop turn."));
    QCommandLineOption smokeOption(
        QStringLiteral("smoke"),
        QStringLiteral("Show one event-loop turn, then exit successfully."));
    parser.addOption(galleryOption);
    parser.addOption(identityOption);
    parser.addOption(windowSizeOption);
    parser.addOption(quitAfterReadyOption);
    parser.addOption(smokeOption);
    parser.process(application);

    if (parser.isSet(galleryOption)
        && !QApplication::setStyle(QStringLiteral("Fusion"))) {
        QTextStream(stderr) << "The Fusion style is required for gallery rendering\n";
        return 2;
    }
    SignalBenchWindow window;
    const QString requestedIdentity = parser.value(identityOption).toLower();
    if (requestedIdentity == QStringLiteral("rack")) {
        window.setIdentity(Identity::Rack);
    } else if (requestedIdentity != QStringLiteral("precision")) {
        QTextStream(stderr) << "Unknown identity: " << requestedIdentity << '\n';
        return 2;
    }

    const QStringList dimensions = parser.value(windowSizeOption).split(QLatin1Char('x'));
    bool widthValid = false;
    bool heightValid = false;
    const int width = dimensions.value(0).toInt(&widthValid);
    const int height = dimensions.value(1).toInt(&heightValid);
    if (dimensions.size() != 2 || !widthValid || !heightValid
        || width < window.minimumWidth() || height < window.minimumHeight()) {
        QTextStream(stderr)
            << "Window size must be WIDTHxHEIGHT and at least "
            << window.minimumWidth() << 'x' << window.minimumHeight() << '\n';
        return 2;
    }
    window.resize(width, height);

    if (parser.isSet(galleryOption)) {
        QString error;
        if (!window.writeGallery(parser.value(galleryOption), &error)) {
            QTextStream(stderr) << error << '\n';
            return 1;
        }
        return 0;
    }

    window.show();
    QTimer::singleShot(0, &window, [&] {
        window.repaint();
        QTimer::singleShot(0, &application, [&] {
            QTextStream(stdout)
                << "SIGNAL_BENCH_READY " << window.width() << 'x' << window.height()
                << ' ' << (window.identity() == Identity::Precision ? "precision" : "rack")
                << Qt::endl;
            if (parser.isSet(smokeOption) || parser.isSet(quitAfterReadyOption)) {
                application.quit();
            }
        });
    });
    return application.exec();
}

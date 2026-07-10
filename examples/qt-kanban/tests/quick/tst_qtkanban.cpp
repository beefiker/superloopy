#include <QtCore/QObject>
#include <QtQuickControls2/QQuickStyle>
#include <QtQuickTest/quicktest.h>

class QtKanbanSetup : public QObject
{
    Q_OBJECT

public slots:
    void applicationAvailable()
    {
        QQuickStyle::setStyle(QStringLiteral("Basic"));
    }
};

QUICK_TEST_MAIN_WITH_SETUP(qtkanban, QtKanbanSetup)

#include "tst_qtkanban.moc"

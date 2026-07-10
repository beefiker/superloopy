#include <QtCore/QObject>
#include <QtGui/QAccessible>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuickControls2/QQuickStyle>
#include <QtQuickTest/quicktest.h>

class AccessibilityProbe : public QObject
{
    Q_OBJECT
    Q_PROPERTY(int buttonRole READ buttonRole CONSTANT)

public:
    using QObject::QObject;

    int buttonRole() const { return int(QAccessible::Button); }

    Q_INVOKABLE QString name(QObject *object) const
    {
        const auto *interface = QAccessible::queryAccessibleInterface(object);
        return interface ? interface->text(QAccessible::Name) : QString();
    }

    Q_INVOKABLE int role(QObject *object) const
    {
        const auto *interface = QAccessible::queryAccessibleInterface(object);
        return interface ? int(interface->role()) : int(QAccessible::NoRole);
    }

    Q_INVOKABLE QString description(QObject *object) const
    {
        const auto *interface = QAccessible::queryAccessibleInterface(object);
        return interface ? interface->text(QAccessible::Description) : QString();
    }

    Q_INVOKABLE bool focused(QObject *object) const
    {
        const auto *interface = QAccessible::queryAccessibleInterface(object);
        return interface && interface->state().focused;
    }

    Q_INVOKABLE bool hasPressAction(QObject *object) const
    {
        auto *interface = QAccessible::queryAccessibleInterface(object);
        auto *actions = interface ? interface->actionInterface() : nullptr;
        return actions && actions->actionNames().contains(
                   QAccessibleActionInterface::pressAction());
    }

    Q_INVOKABLE bool press(QObject *object) const
    {
        auto *interface = QAccessible::queryAccessibleInterface(object);
        auto *actions = interface ? interface->actionInterface() : nullptr;
        if (!actions || !actions->actionNames().contains(
                    QAccessibleActionInterface::pressAction())) {
            return false;
        }
        actions->doAction(QAccessibleActionInterface::pressAction());
        return true;
    }

};

class QtKanbanSetup : public QObject
{
    Q_OBJECT

    AccessibilityProbe m_accessibilityProbe;

public slots:
    void applicationAvailable()
    {
        QQuickStyle::setStyle(QStringLiteral("Basic"));
        QAccessible::setActive(true);
    }

    void qmlEngineAvailable(QQmlEngine *engine)
    {
        engine->rootContext()->setContextProperty(
            QStringLiteral("AccessibilityProbe"), &m_accessibilityProbe);
    }
};

QUICK_TEST_MAIN_WITH_SETUP(qtkanban, QtKanbanSetup)

#include "tst_qtkanban.moc"

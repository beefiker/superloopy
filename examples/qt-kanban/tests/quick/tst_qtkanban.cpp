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
    Q_PROPERTY(QString lastAnnouncement READ lastAnnouncement NOTIFY announcementChanged)
    Q_PROPERTY(int lastPoliteness READ lastPoliteness NOTIFY announcementChanged)
    Q_PROPERTY(int announcementCount READ announcementCount NOTIFY announcementChanged)
    Q_PROPERTY(int politePoliteness READ politePoliteness CONSTANT)
    Q_PROPERTY(int assertivePoliteness READ assertivePoliteness CONSTANT)

    inline static AccessibilityProbe *s_instance = nullptr;
    QAccessible::UpdateHandler m_previousUpdateHandler = nullptr;
    QString m_lastAnnouncement;
    int m_lastPoliteness = -1;
    int m_announcementCount = 0;

public:
    using QObject::QObject;

    ~AccessibilityProbe() override
    {
        if (s_instance == this) {
            QAccessible::installUpdateHandler(m_previousUpdateHandler);
            s_instance = nullptr;
        }
    }

    int buttonRole() const { return int(QAccessible::Button); }
    QString lastAnnouncement() const { return m_lastAnnouncement; }
    int lastPoliteness() const { return m_lastPoliteness; }
    int announcementCount() const { return m_announcementCount; }
    int politePoliteness() const
    {
        return int(QAccessible::AnnouncementPoliteness::Polite);
    }
    int assertivePoliteness() const
    {
        return int(QAccessible::AnnouncementPoliteness::Assertive);
    }

    void start()
    {
        if (s_instance == this)
            return;
        s_instance = this;
        m_previousUpdateHandler = QAccessible::installUpdateHandler(
            &AccessibilityProbe::handleUpdate);
        if (m_previousUpdateHandler == &AccessibilityProbe::handleUpdate)
            m_previousUpdateHandler = nullptr;
    }

    static void handleUpdate(QAccessibleEvent *event)
    {
        if (s_instance && event && event->type() == QAccessible::Announcement) {
            const auto *announcement = static_cast<QAccessibleAnnouncementEvent *>(event);
            s_instance->m_lastAnnouncement = announcement->message();
            s_instance->m_lastPoliteness = int(announcement->politeness());
            ++s_instance->m_announcementCount;
            emit s_instance->announcementChanged();
        }
        if (s_instance && s_instance->m_previousUpdateHandler
            && s_instance->m_previousUpdateHandler
                   != &AccessibilityProbe::handleUpdate) {
            s_instance->m_previousUpdateHandler(event);
        }
    }

    Q_INVOKABLE void resetAnnouncements()
    {
        m_lastAnnouncement.clear();
        m_lastPoliteness = -1;
        m_announcementCount = 0;
        emit announcementChanged();
    }

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

    Q_INVOKABLE bool selected(QObject *object) const
    {
        const auto *interface = QAccessible::queryAccessibleInterface(object);
        return interface && interface->state().selected;
    }

    Q_INVOKABLE bool selectable(QObject *object) const
    {
        const auto *interface = QAccessible::queryAccessibleInterface(object);
        return interface && interface->state().selectable;
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

signals:
    void announcementChanged();

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
        m_accessibilityProbe.start();
    }

    void qmlEngineAvailable(QQmlEngine *engine)
    {
        engine->rootContext()->setContextProperty(
            QStringLiteral("AccessibilityProbe"), &m_accessibilityProbe);
    }
};

QUICK_TEST_MAIN_WITH_SETUP(qtkanban, QtKanbanSetup)

#include "tst_qtkanban.moc"

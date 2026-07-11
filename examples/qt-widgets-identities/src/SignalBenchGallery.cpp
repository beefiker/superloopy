#include "SignalBenchWindow.h"

#include <QAbstractItemView>
#include <QAbstractScrollArea>
#include <QApplication>
#include <QDir>
#include <QImage>
#include <QLayout>
#include <QPainter>
#include <QPointer>
#include <QRegion>
#include <QScrollBar>
#include <QSplitter>
#include <QTableView>

namespace SignalBench {

bool SignalBenchWindow::writeGallery(const QString &directory, QString *error)
{
    const bool wasActive = isActiveWindow();
    const bool pickerHadFocus = m_picker && (m_picker->hasFocus()
        || (QApplication::focusWidget() && m_picker->isAncestorOf(QApplication::focusWidget())));
    QPointer<QWidget> originalFocus = QApplication::focusWidget();
    bool result = false;
    {
        SignalBenchWindow renderer;
        result = renderer.renderGallery(directory, error);
    }
    if (wasActive) {
        activateWindow();
    }
    if (pickerHadFocus) {
        m_picker->setFocus(Qt::OtherFocusReason);
    } else if (originalFocus) {
        originalFocus->setFocus(Qt::OtherFocusReason);
    }
    QApplication::processEvents();
    return result;
}

bool SignalBenchWindow::renderGallery(const QString &directory, QString *error)
{
    const QDir requested(directory);
    if (!QDir().mkpath(requested.absolutePath())) {
        if (error) {
            *error = tr("Could not create gallery directory: %1").arg(directory);
        }
        return false;
    }

    struct Shot {
        Identity identity;
        GalleryState state;
        const char *fileName;
    };
    const Shot shots[] = {
        {Identity::Precision, GalleryState::Normal, "precision_normal.png"},
        {Identity::Precision, GalleryState::Focused, "precision_focused.png"},
        {Identity::Precision, GalleryState::Selected, "precision_selected.png"},
        {Identity::Precision, GalleryState::Disabled, "precision_disabled.png"},
        {Identity::Rack, GalleryState::Normal, "rack_normal.png"},
        {Identity::Rack, GalleryState::Focused, "rack_focused.png"},
        {Identity::Rack, GalleryState::Selected, "rack_selected.png"},
        {Identity::Rack, GalleryState::Disabled, "rack_disabled.png"},
    };

    resize(1280, 800);
    show();
    QApplication::processEvents();
    for (const Shot &shot : shots) {
        m_splitter->setEnabled(true);
        setIdentity(shot.identity);
        m_splitter->setSizes({250, 720, 250});
        const QList<int> dialValues = {-2, 1, 8};
        for (int index = 0; index < m_dials.size(); ++index) {
            m_dials.at(index)->setValue(dialValues.at(index));
        }
        auto *selection = m_session->presetSelection();
        const QModelIndex stateIndex = m_session->presetModel()->index(2, 0);
        selection->clearSelection();
        selection->setCurrentIndex(stateIndex, QItemSelectionModel::NoUpdate);
        m_picker->verticalScrollBar()->setValue(0);
        m_bandTable->verticalScrollBar()->setValue(0);
        if (QWidget *focused = QApplication::focusWidget();
            focused && (focused == this || isAncestorOf(focused))) {
            focused->clearFocus();
        }

        if (shot.state == GalleryState::Selected) {
            selection->select(stateIndex,
                              QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
        } else if (shot.state == GalleryState::Disabled) {
            selection->select(stateIndex,
                              QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
            m_splitter->setEnabled(false);
        }

        m_root->layout()->activate();
        QApplication::processEvents();
        if (shot.state == GalleryState::Focused) {
            m_picker->setFocus(Qt::TabFocusReason);
        } else if (QWidget *focused = QApplication::focusWidget();
                   focused && (focused == this || isAncestorOf(focused))) {
            focused->clearFocus();
        }
        QApplication::processEvents();
        if (hasUnexpectedHorizontalScrollbars()) {
            hide();
            if (error) {
                *error = tr("An unexpected horizontal scrollbar is visible");
            }
            return false;
        }
        QImage image(QSize(1280, 800), QImage::Format_ARGB32_Premultiplied);
        image.setDevicePixelRatio(1.0);
        image.fill(Qt::transparent);
        QPainter painter(&image);
        render(&painter, QPoint(), QRegion(), QWidget::DrawWindowBackground | QWidget::DrawChildren);
        painter.end();
        const QString path = requested.filePath(QString::fromLatin1(shot.fileName));
        if (!image.save(path, "PNG")) {
            hide();
            if (error) {
                *error = tr("Could not write gallery image: %1").arg(path);
            }
            return false;
        }
    }

    hide();

    const QStringList actual = requested.entryList(
        {QStringLiteral("*.png")}, QDir::Files, QDir::Name);
    if (actual != galleryFileNames()) {
        if (error) {
            *error = tr("Gallery must contain exactly the eight expected PNG files");
        }
        return false;
    }
    for (const QString &fileName : actual) {
        const QImage image(requested.filePath(fileName));
        if (image.size() != QSize(1280, 800)) {
            if (error) {
                *error = tr("Gallery image has the wrong size: %1").arg(fileName);
            }
            return false;
        }
    }
    if (hasUnexpectedHorizontalScrollbars()) {
        if (error) {
            *error = tr("An unexpected horizontal scrollbar is visible");
        }
        return false;
    }
    if (error) {
        error->clear();
    }
    return true;
}

bool SignalBenchWindow::hasUnexpectedHorizontalScrollbars() const
{
    const auto scrollAreas = m_root->findChildren<QAbstractScrollArea *>();
    for (QAbstractScrollArea *area : scrollAreas) {
        QScrollBar *bar = area->horizontalScrollBar();
        if (bar && bar->isVisible() && bar->maximum() > bar->minimum()) {
            return true;
        }
    }
    return false;
}

QStringList SignalBenchWindow::galleryFileNames()
{
    return {
        QStringLiteral("precision_disabled.png"),
        QStringLiteral("precision_focused.png"),
        QStringLiteral("precision_normal.png"),
        QStringLiteral("precision_selected.png"),
        QStringLiteral("rack_disabled.png"),
        QStringLiteral("rack_focused.png"),
        QStringLiteral("rack_normal.png"),
        QStringLiteral("rack_selected.png"),
    };
}

} // namespace SignalBench

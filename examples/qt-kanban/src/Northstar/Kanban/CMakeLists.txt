set_source_files_properties(Theme.qml PROPERTIES
    QT_QML_SINGLETON_TYPE TRUE
)

set_source_files_properties(TaskStore.qml PROPERTIES
    QT_QML_SINGLETON_TYPE TRUE
)

qt_add_library(qtkanban_ui SHARED)

qt_add_qml_module(qtkanban_ui
    URI Northstar.Kanban
    VERSION 1.0
    QML_FILES
        Main.qml
        KanbanView.qml
        Theme.qml
        TaskStore.qml
)

target_link_libraries(qtkanban_ui PRIVATE
    Qt6::Quick
    Qt6::QuickControls2
    Qt6::Svg
)

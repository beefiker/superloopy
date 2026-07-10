qt_add_executable(tst_qtkanban
    tst_qtkanban.cpp
)

target_link_libraries(tst_qtkanban PRIVATE
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
    Qt6::QuickControls2
    Qt6::QuickTest
    qtkanban_ui
)

target_compile_definitions(tst_qtkanban PRIVATE
    QUICK_TEST_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
)

qt_add_qml_module(tst_qtkanban
    URI QtKanban.Tests
    VERSION 1.0
    QML_FILES
        tst_smoke.qml
        tst_store.qml
    IMPORTS
        TARGET qtkanban_ui
)

add_test(
    NAME qtkanban.quick
    COMMAND tst_qtkanban -platform offscreen
)

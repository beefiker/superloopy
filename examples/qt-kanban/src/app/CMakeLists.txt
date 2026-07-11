qt_add_executable(qtkanban
    main.cpp
)

target_link_libraries(qtkanban PRIVATE
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
    Qt6::QuickControls2
    qtkanban_ui
)

add_test(
    NAME qtkanban.launch
    COMMAND ${CMAKE_COMMAND} -E env
        QT_QPA_PLATFORM=offscreen
        $<TARGET_FILE:qtkanban>
        --window-size 1000x700
        --quit-after-ready
)
set_tests_properties(qtkanban.launch PROPERTIES
    PASS_REGULAR_EXPRESSION "NORTHSTAR_READY 1000x700"
    TIMEOUT 10
)

add_test(
    NAME qtkanban.invalid-size
    COMMAND ${CMAKE_COMMAND} -E env
        QT_QPA_PLATFORM=offscreen
        $<TARGET_FILE:qtkanban>
        --window-size 800x600
        --quit-after-ready
)
set_tests_properties(qtkanban.invalid-size PROPERTIES
    TIMEOUT 10
    WILL_FAIL TRUE
)

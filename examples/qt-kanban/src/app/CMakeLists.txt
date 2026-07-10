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

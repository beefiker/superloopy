cmake_minimum_required(VERSION 3.21)

project(QtKanban VERSION 0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.11.1 EXACT REQUIRED COMPONENTS
    Gui
    Qml
    Quick
    QuickControls2
    QuickTest
    Svg
)

qt_standard_project_setup(REQUIRES 6.11)

enable_testing()

add_subdirectory(src/Northstar/Kanban)
add_subdirectory(src/app)
add_subdirectory(tests/quick)

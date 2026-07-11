cmake_minimum_required(VERSION 3.21)

project(SignalBench VERSION 0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 6.11.1 EXACT REQUIRED COMPONENTS
    Core
    Gui
    Widgets
    Test
)

qt_standard_project_setup(REQUIRES 6.11)

add_library(signalbench_ui STATIC
    src/IdentitySystem.h
    src/IdentitySystem.cpp
    src/IdentityPresentation.cpp
    src/SignalBenchWindow.h
    src/SignalBenchWindow.cpp
    src/SignalBenchGallery.cpp
)

target_include_directories(signalbench_ui PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(signalbench_ui PUBLIC
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
)

if(MSVC)
    target_compile_options(signalbench_ui PRIVATE /W4 /permissive-)
else()
    target_compile_options(signalbench_ui PRIVATE -Wall -Wextra -Wpedantic)
endif()

qt_add_executable(qtwidgetsidentities
    src/main.cpp
)

set_target_properties(qtwidgetsidentities PROPERTIES
    MACOSX_BUNDLE FALSE
)

target_link_libraries(qtwidgetsidentities PRIVATE
    signalbench_ui
)

qt_add_executable(tst_signalbench
    tests/tst_signalbench.cpp
)

target_link_libraries(tst_signalbench PRIVATE
    Qt6::Test
    signalbench_ui
)
add_dependencies(tst_signalbench qtwidgetsidentities)

enable_testing()

add_test(NAME signalbench.widgets COMMAND tst_signalbench)
add_test(
    NAME signalbench.launch
    COMMAND qtwidgetsidentities
        --identity rack
        --window-size 1000x680
        --quit-after-ready
)
add_test(
    NAME signalbench.gallery
    COMMAND qtwidgetsidentities --gallery ${CMAKE_CURRENT_BINARY_DIR}/gallery
)
set_tests_properties(
    signalbench.widgets
    signalbench.launch
    signalbench.gallery
    PROPERTIES
    ENVIRONMENT "QT_QPA_PLATFORM=offscreen;QT_STYLE_OVERRIDE=Fusion;QT_SCALE_FACTOR=1;LC_ALL=en_US.UTF-8;LANG=en_US.UTF-8"
)
set_tests_properties(signalbench.launch PROPERTIES
    PASS_REGULAR_EXPRESSION "SIGNAL_BENCH_READY 1000x680 rack"
)

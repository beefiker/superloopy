import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    id: testCase
    name: "Smoke"
    when: windowShown

    Component { id: viewComponent; KanbanView {} }

    function test_module_is_importable() {
        const view = createTemporaryObject(viewComponent, testCase)
        verify(view)
        compare(view.objectName, "kanbanView")
    }
}

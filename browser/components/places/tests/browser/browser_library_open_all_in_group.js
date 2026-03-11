/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const { TabGroupTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TabGroupTestUtils.sys.mjs"
);

const TEST_FOLDER_TITLE = "Test Folder";

let tree = [
  {
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
    title: TEST_FOLDER_TITLE,
    children: [
      {
        url: "https://example1.com",
        title: "bm1",
      },
      {
        url: "https://example2.com",
        title: "bm2",
      },
      {
        url: "https://example3.com",
        title: "bm3",
      },
    ],
  },
];

let folder = {};

add_setup(async function () {
  await PlacesUtils.bookmarks.eraseEverything();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.groups.enabled", true]],
  });

  folder = await PlacesUtils.bookmarks.insertTree({
    children: tree,
    guid: PlacesUtils.bookmarks.toolbarGuid,
  });

  registerCleanupFunction(async function () {
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

add_task(async function test_open_all_in_group_from_library() {
  let gLibrary = await promiseLibrary("AllBookmarks");
  gLibrary.PlacesOrganizer.selectLeftPaneBuiltIn("BookmarksToolbar");

  // Select the folder in the right pane.
  let right = gLibrary.ContentTree.view;
  let folderIndex = null;
  for (let i = 0; i < right.view.rowCount; i++) {
    let node = right.view.nodeForTreeIndex(i);
    if (node.title === TEST_FOLDER_TITLE) {
      folderIndex = i;
      break;
    }
  }
  Assert.notEqual(folderIndex, null, "Found the test folder");
  right.selectNode(right.view.nodeForTreeIndex(folderIndex));

  let placesContext = gLibrary.document.getElementById("placesContext");
  let promiseContextMenu = BrowserTestUtils.waitForEvent(
    placesContext,
    "popupshown"
  );
  synthesizeClickOnSelectedTreeCell(right, {
    button: 2,
    type: "contextmenu",
  });
  await promiseContextMenu;

  let openInGroup = gLibrary.document.getElementById(
    "placesContext_openBookmarkContainer:group"
  );
  Assert.ok(openInGroup, "Open in group menu item exists");
  Assert.ok(
    BrowserTestUtils.isVisible(openInGroup),
    "Open in group menu item is visible"
  );

  let tabGroupCreated = BrowserTestUtils.waitForEvent(
    window,
    "TabGroupCreatedByUser"
  );
  
  placesContext.activateItem(openInGroup);

  // Wait for new tabs to be opened.
  let tabGroup = await tabGroupCreated;

  // Verify a tab group was created with the correct label.
  Assert.equal(
    tabGroup.label,
    "Test Folder",
    "A tab group was created with the folder name"
  );

  Assert.equal(
    tabGroup.tabs.length,
    tree[0].children.length,
    "Tab group contains the correct number of tabs"
  );

  // Clean up: remove the tab group and its tabs.
  await TabGroupTestUtils.removeTabGroup(tabGroup.tabs);

  await promiseLibraryClosed(gLibrary);
});

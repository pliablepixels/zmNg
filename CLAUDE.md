Global Rules
-------------
- All text needs to be internationalized. Always make sure all language files are in sync and updated with each change
- Always prefer DRY: Write reusable, high quality code. Don't duplicate the same code 
- Keep code simple
- Keep code modular
- Remember all code needs to work on iOS, Android and Desktop
- Specifically, all screens need to reflow on mobile devices. Sometimes this means in portrait view, implement icon only buttons if needed or they need to wrap
- Every setting you add MUST be linked to the current profile and not global
- Never keep legacy files or code - remove them
- When you make changes that may be breaking (such as changes in layout profile), always avoid the app crashing. Feel free to prompt the user to reset the profile if that happens instead of the app crashing
- Write high quality documentation & code comments but don't use words like comprehensive and other lofty terms. Be concise, yet clear.
- When you implement clicks inside views that navigate to other views, always implement a "stacked" navigation, which means a back arrow to go back to the screen you came from
- Always use proper log functions, not console logs
- If you land up changing core iOS/Android code, make sure that they will not be overwritten and re-generated
- Make sure test cases are comprehensive
- If you add or modify and UI or functionality, make sure to modify the tests and make sure all UI components have data tags that can be used for BDD testing
- When you make changes to the app, always make sure to run the test suite and make sure it passes
- If you make changes to the UI, make sure to also update the test cases, if selectors or navigation elements have changed


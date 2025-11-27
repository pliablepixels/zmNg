# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img [ref=e10]
      - generic [ref=e13]: Welcome to zmNg
      - generic [ref=e14]: Connect to your ZoneMinder server to get started
    - generic [ref=e15]:
      - generic [ref=e16]:
        - text: Server URL
        - generic [ref=e17]:
          - img [ref=e18]
          - textbox "Server URL" [ref=e21]:
            - /placeholder: https://demo.zoneminder.com
            - text: https://demo.zoneminder.com
      - generic [ref=e22]:
        - generic [ref=e23]:
          - text: Username
          - textbox "Username" [ref=e24]:
            - /placeholder: admin
        - generic [ref=e25]:
          - text: Password
          - generic [ref=e26]:
            - textbox "Password" [ref=e27]:
              - /placeholder: ••••••••
            - button [ref=e28] [cursor=pointer]:
              - img
    - button "Connect Server" [ref=e30] [cursor=pointer]:
      - text: Connect Server
      - img
  - region "Notifications alt+T"
```
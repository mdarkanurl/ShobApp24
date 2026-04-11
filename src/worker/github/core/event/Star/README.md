# Star event

## Description
This folder contains the logic for handling the star event. A star event has two actions: created and deleted. When someone stars a repository, GitHub sends a “created” event with relevant data, and when someone removes a star from a repository, GitHub sends a “deleted” event.

## How it works
- Check if the user is subscribed to the star event by querying the workflow table.
- If the user is subscribed, fetch all actions associated with the workflow. Otherwise, call `act()` with the message.
- After retrieving all actions, execute them sequentially.
- At the end of the process, call `act()` or `nact()` depending on the outcome.

## Supported actions
Both “created” & “deleted”:
- `collect_viewer_data` action allows collect viewer data.
- `send-email` action allows send email to any email address with viewer's data or whitout data viewer's.
- `send_email_to_me` action allows send email to user's email address with viewer's data or whitout data viewer's.
- `send_email_to_who_send_the_trigger` action allows send email to viewer.
- `webhook` action allows call a webhook.
- `send_telegram` action allows send message to telegram.

## Contributing
Contributions, issues, and feature requests are welcome!
If you want to contribute to ShobApp24, please follow the guidelines outlined in the [contributing.md](../../../../../../contributing.md) file.

## License
ShobApp24 is licensed under the MIT License - see the [LICENSE](../../../../../../LICENSE) file for details.

# Smoke test config docs

These should be in a `./test/smoke.js` file


This should export an array of objects, each of which *must* have a `url` property, which defines mappings between urls to test and expected responses

e.g

```
module.exports = [
	{
		urls: {
			'/home': 200,
			'/forbidden': 401
		}
	}
]
```

Values accepted as expectations for each url are

- number - a status code
- string - a url to get redirected to (agnostic as to 301/302)
- object - an object defining various properties of the response. Can include properties:
	- `headers`: an object of key/value pairs defining headers to expect
	- `status`: expected status code
	- `content`: expected content (as text)


For each set of urls additional options can be set to configure the requests

- `timeout` : number of miliseconds to allow for th request
- `headers`: an object of key/value pairs defining headers to send
- `method`: http method to use (defaults to GET)
- `body`: object (which will be converted to JSON) or string to send as body


e.g. a more complex example
```
module.exports = [
	{
		urls: {
			'/home': 200,
			'/forbidden': 401
		}
	},
	{
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Basic ly'
		},
		body: {userId: 123},
		urls: {
			'/api/create-user': {
				content: '{accepted: true}'
			}
		}
	}
]
```
const normalize = require('./normalize-name');

describe('normalize', function () {
	it('removes ft prefixes without options', function () {
		const alpha = normalize('ft-alpha');
		const beta = normalize('next-beta');
		const gamma = normalize('@financial-times/gamma');

		expect(alpha).toBe('alpha');
		expect(beta).toBe('beta');
		expect(gamma).toBe('@financial-times/gamma');
	});

	it('removes ft prefixes and versions', function () {
		const alpha = normalize('ft-alpha-v1', { version: false });
		const beta = normalize('next-beta-v99', { version: false });
		const gamma = normalize('ft-gamma-v123', { version: false });
		const delta = normalize('next-delta-v123', { version: false });
		const epsilon = normalize('@financial-times/epsilon', { version: false });

		expect(alpha).toBe('alpha-v1');
		expect(beta).toBe('beta-v99');
		expect(gamma).toBe('gamma');
		expect(delta).toBe('delta');
		expect(epsilon).toBe('epsilon');
	});
});

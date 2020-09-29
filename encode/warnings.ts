export class ENCWarning {
	readonly msg!: string;

	readonly warningname!: string;

	readonly details?: string;

	constructor(
		warningname: string,
		msg: string,
		details?: string
	) {
		Object.assign(
			this, {
				warningname,
				msg,
				details
			}
		);

		this.warn();
	}

	warn() {
		console.warn(
			"%s: %s\n%s",
			this.warningname,
			this.msg,
			this.details
		);
	}
};

const Warning = (
	warningname: string,
) => class extends ENCWarning {
	constructor(
		msg: string,
		details?: string
	) {
		super(
			warningname,
			msg,
			details
		);
	}
};

export const ENCUnusedParameter = Warning("Unused parameter");
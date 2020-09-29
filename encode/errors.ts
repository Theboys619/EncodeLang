export class ENCError {
	// null assertion black magic
	readonly msg!: string;
	readonly errorname!: string;

	constructor(
		msg: string,
		errorname = "ENCError"
	) {
		Object.assign(
			this, {
				msg,
				errorname
			}
		);

			this.throw();
		}

	throw() {
		console.error(
			"%s: %s",
			this.errorname,
			this.msg
		);

		throw this;
	}
};

const Warning = (errorname: string) => class extends ENCError {
	constructor(msg: string) {
		super(msg, errorname);
	}
};

export const ENCSyntaxError = Warning("ENCSnytaxError");

export const ENCInvalidCharacter = Warning("ENCInvalidCharacter");
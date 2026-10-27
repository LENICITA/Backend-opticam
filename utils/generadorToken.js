import jwt from 'jsonwebtoken';

export const generateToken = (id_usuario) => {
    const expiresIn = 60 * 60 * 24 * 30; //tiempo que expira el jwt token

    try {
        const token = jwt.sign({ id: id_usuario}, process.env.JWT_SECRET, {expiresIn});
        return { token, expiresIn };
    } catch (error) {
        console.log(error);
        throw new Error('Error al generar token');
    }
};

export const generateRefreshToken = (id_usuario, res) => {
    const expiresIn = 60 * 60 * 24 * 30;
    try {
        const refreshToken = jwt.sign({id_usuario}, process.env.JWT_REFRESH, {expiresIn})
        
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: !(process.env.MODO === "developer"),
            expires: new Date(Date.now() + expiresIn * 1000)
        });
    } catch (error) {
        console.log(error);
        throw new Error('Error al generar refresh token');
    }
};

export const tokenVerificationErrors = {
    "invalid signature": "La firma del JWT no es válida",
    "jwt expired": "El JWT ha expirado",
    "invalid token": "El JWT no es válido",
    "No Bearer": "El formato del token es incorrecto, debe ser Bearer [token]",
    "jwt malformed": "JWT formato no valido"
};
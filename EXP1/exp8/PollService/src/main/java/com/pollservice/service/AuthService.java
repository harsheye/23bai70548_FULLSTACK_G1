package com.livepoll.service;

import com.livepoll.dto.AuthRequest;
import com.livepoll.dto.AuthResponse;

public interface AuthService {

    AuthResponse login(AuthRequest request);

}